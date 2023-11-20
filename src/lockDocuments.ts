import { Effect, pipe } from 'effect'
import getMutationErrors from './getMutationErrors'
import { RevMismatchError } from './isRevTheSame'
import {
  ContextWithFreshDocuments,
  MainDocTranslationMetadata,
  SanityDocumentWithPhraseMetadata,
} from './types'
import { getTranslationKey } from './utils'

class FailedLockingError {
  readonly _tag = 'FailedLockingError'
  constructor(error: unknown) {}
}

export default function lockDocuments(context: ContextWithFreshDocuments) {
  const transaction = getLockTransaction(context)

  return pipe(
    Effect.tryPromise({
      try: () =>
        transaction.commit({
          returnDocuments: false,
          autoGenerateArrayKeys: true,
        }),
      catch: (error) => {
        const mutationError = getMutationErrors(error)
        const mistmatchedRevError =
          mutationError &&
          mutationError.items?.find?.(
            (i) =>
              i &&
              'error' in i &&
              i.error?.type === 'documentRevisionIDDoesNotMatchError',
          )
        if (mistmatchedRevError) {
          return new RevMismatchError(
            // @ts-expect-error @sanity/client doesn't expose the full mutation error interface
            mistmatchedRevError.error.expectedRevisionID,
            // @ts-expect-error @sanity/client doesn't expose the full mutation error interface
            mistmatchedRevError.error.currentRevisionID,
          )
        }

        return new FailedLockingError(error)
      },
    }),
    Effect.tap(() =>
      Effect.logInfo('[lockDocuments] Successfully locked documents'),
    ),
    Effect.withLogSpan('lockDocuments'),
  )
}

function getLockTransaction(context: ContextWithFreshDocuments) {
  const { request, freshDocuments } = context
  const { paths, sourceDoc } = request
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
        projectName: context.translationName,
        filename: context.translationFilename,
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
