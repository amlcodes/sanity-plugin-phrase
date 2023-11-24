import { Effect, pipe } from 'effect'
import getMutationErrors from '../backendHelpers'
import {
  ContextWithFreshDocuments,
  MainDocTranslationMetadata,
  SanityDocumentWithPhraseMetadata,
} from '../types'
import { tPathInMainDoc } from '../utils'
import { RevMismatchError } from './isRevTheSame'

class FailedLockingError {
  readonly _tag = 'FailedLockingError'

  constructor(readonly error: unknown) {}
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
    Effect.tapErrorTag('FailedLockingError', (error) =>
      Effect.logError(error.error),
    ),
    Effect.tap(() =>
      Effect.logInfo('[lockDocuments] Successfully locked documents'),
    ),
    Effect.withLogSpan('lockDocuments'),
  )
}

function getLockTransaction(context: ContextWithFreshDocuments) {
  const { request, freshDocuments } = context
  const { paths } = request

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
          phraseMetadata: {
            _type: 'phrase.main.meta',
            translations: [],
          },
        } as Pick<SanityDocumentWithPhraseMetadata, 'phraseMetadata'>)
        .ifRevisionId(doc._rev)

      const metadata: MainDocTranslationMetadata = {
        _type: 'phrase.mainDoc.translation',
        _key: request.translationKey,
        _createdAt: new Date().toISOString(),
        sourceDoc: request.sourceDoc,
        paths,
        status: 'CREATING',
      }
      if (
        doc.phraseMetadata?._type === 'phrase.main.meta' &&
        doc.phraseMetadata.translations?.some(
          (t) => t._key === request.translationKey,
        )
      ) {
        return patch
          .insert('replace', tPathInMainDoc(request.translationKey), [metadata])
          .ifRevisionId(doc._rev)
      }

      return patch
        .append('phraseMetadata.translations', [metadata])
        .ifRevisionId(doc._rev)
    })
  }

  return transaction
}
