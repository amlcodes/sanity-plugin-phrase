import { Effect, pipe } from 'effect'
import {
  MainDocTranslationMetadata,
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { getTranslationKey, getTranslationName } from './utils'

class FailedLockingError {
  readonly _tag = 'FailedLockingError'
  constructor(error: unknown) {}
}

export default function lockDocuments(
  request: TranslationRequest & {
    freshDocuments: SanityTranslationDocPair[]
  },
) {
  const transaction = getLockTransaction(request)

  return pipe(
    Effect.tryPromise({
      try: () =>
        transaction.commit({
          returnDocuments: false,
          autoGenerateArrayKeys: true,
        }),
      // @TODO: further divide this error. If the transaction is broken (rev changed, etc), we can't recover, need to fail. If Sanity is down, we can keep retrying.
      catch: (error) => new FailedLockingError(error),
    }),
    Effect.tap(() =>
      Effect.logInfo('[lockDocuments] Successfully locked documents'),
    ),
    Effect.withLogSpan('lockDocuments'),
  )
}

function getLockTransaction(
  request: TranslationRequest & { freshDocuments: SanityTranslationDocPair[] },
) {
  const { paths, freshDocuments, sourceDoc } = request
  const { name: translationName, filename } = getTranslationName(request)
  const translationKey = getTranslationKey(paths, sourceDoc._rev)

  const docs = freshDocuments.flatMap(
    (d) =>
      [d.draft, d.published].filter(
        Boolean,
      ) as SanityDocumentWithPhraseMetadata[],
  )

  const transaction = request.sanityClient.transaction()
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => {
      patch
        .setIfMissing({
          phraseMeta: {
            _type: 'phrase.main.meta',
            translations: [],
          },
        } as Pick<SanityDocumentWithPhraseMetadata, 'phraseMeta'>)
        .ifRevisionId(doc._rev)

      const translationMetadata: MainDocTranslationMetadata = {
        _type: 'phrase.mainDoc.translation',
        _key: translationKey,
        _createdAt: new Date().toISOString(),
        sourceDocRev: request.sourceDoc._rev,
        projectName: translationName,
        filename,
        paths,
        status: 'CREATING',
      }
      if (
        doc.phraseMeta?._type === 'phrase.main.meta' &&
        doc.phraseMeta.translations?.some((t) => t._key === translationKey)
      ) {
        return patch
          .insert(
            'replace',
            `phraseMeta.translations[_key == "${translationKey}"]`,
            [translationMetadata],
          )
          .ifRevisionId(doc._rev)
      }

      return patch
        .append('phraseMeta.translations', [translationMetadata])
        .ifRevisionId(doc._rev)
    })
  }

  return transaction
}
