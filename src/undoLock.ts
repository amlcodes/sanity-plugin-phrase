import { Effect, pipe } from 'effect'
import {
  ContextWithFreshDocuments,
  SanityDocumentWithPhraseMetadata,
} from './types'
import { getTranslationKey } from './utils'

class FailedUnlockingError {
  readonly _tag = 'FailedUnlockingError'
  constructor(error: unknown) {}
}

export default function undoLock(context: ContextWithFreshDocuments) {
  const transaction = getUnlockTransaction(context)

  return pipe(
    Effect.tryPromise({
      try: () =>
        transaction.commit({
          returnDocuments: false,
          autoGenerateArrayKeys: true,
        }),
      catch: (error) => new FailedUnlockingError(error),
    }),
    Effect.tap(() =>
      Effect.logInfo('[undoLock] Successfully unlocked documents'),
    ),
    Effect.withLogSpan('undoLock'),
  )
}

function getUnlockTransaction({
  request,
  freshDocuments,
}: ContextWithFreshDocuments) {
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
      return patch.unset([
        `phraseMeta.translations[_key == "${translationKey}"]`,
      ])
    })
  }

  return transaction
}
