import { Effect, pipe } from 'effect'
import { ContextWithFreshDocuments, SanityTMD } from '../types'
import {
  TMD_TYPE,
  getPtdId,
  getTmdId,
  getTranslationSnapshot,
  isDraft,
  undraftId,
} from '../utils'

class FailedCreatingTMDError {
  readonly _tag = 'FailedCreatingTMDError'

  constructor(readonly error: unknown) {}
}

export default function createTMD(context: ContextWithFreshDocuments) {
  const activeTMD = createTMDDoc(context)

  return pipe(
    Effect.tryPromise({
      try: () => context.request.sanityClient.create(activeTMD),
      catch: (error) => new FailedCreatingTMDError(error),
    }),
    Effect.tapErrorTag('FailedCreatingTMDError', (error) =>
      Effect.logError(error.error),
    ),
    Effect.tap(() =>
      Effect.logInfo('[lockDocuments] Successfully locked documents'),
    ),
    Effect.withLogSpan('lockDocuments'),
    Effect.map(() => ({
      ...context,
      activeTMD,
    })),
  )
}

function createTMDDoc({
  request: { diffs, sourceDoc, translationKey, dateDue, targetLangs },
  freshSourceDoc,
  freshDocuments,
}: ContextWithFreshDocuments) {
  const createdAt = new Date().toISOString()
  const targets: SanityTMD<'CREATING'>['targets'] = targetLangs.map((lang) => {
    const targetLangDocPair = freshDocuments.find(
      (d) => d.lang.phrase === lang.phrase,
    )
    const targetLangDoc =
      targetLangDocPair?.draft || targetLangDocPair?.published || freshSourceDoc

    return {
      _key: lang.sanity,
      lang,
      ptd: {
        _type: 'reference',
        _ref: getPtdId({ targetLang: lang, translationKey }),
        _weak: true,
      },
      targetDoc: {
        _type: 'reference',
        _ref: undraftId(targetLangDoc._id),
        _weak: isDraft(targetLangDoc._id) ? true : undefined,
        _strengthenOnPublish: isDraft(sourceDoc._id)
          ? {
              type: sourceDoc._type,
            }
          : undefined,
      },
      jobs: undefined,
    }
  })

  const TMD: SanityTMD<'CREATING'> = {
    _createdAt: createdAt,
    _updatedAt: createdAt,
    _id: getTmdId(translationKey),
    _type: TMD_TYPE,
    // @ts-expect-error
    _rev: undefined,
    translationKey,
    diffs,
    projectDueDate: dateDue,
    phraseProjectUid: undefined,
    salvaged: undefined,
    status: 'CREATING',
    sourceDoc,
    sourceRef: {
      _type: 'reference',
      _ref: undraftId(sourceDoc._id),
      _weak: isDraft(sourceDoc._id) ? true : undefined,
      _strengthenOnPublish: isDraft(sourceDoc._id)
        ? {
            type: sourceDoc._type,
          }
        : undefined,
    },
    sourceLang: sourceDoc.lang,
    sourceSnapshot: getTranslationSnapshot(freshSourceDoc),
    targets,
  }

  return TMD
}
