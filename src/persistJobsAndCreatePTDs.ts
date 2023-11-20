import { Effect, pipe } from 'effect'
import { createPTDs } from './createPTDs'
import { ContextWithJobs, SanityDocumentWithPhraseMetadata } from './types'
import { getTranslationKey } from './utils'

class PersistJobsAndCreatePTDsError {
  readonly context: ContextWithJobs
  readonly _tag = 'PersistJobsAndCreatePTDs'

  // @TODO: further divide this error. If the transaction is broken (rev changed, etc), we can't recover, need to fail. If Sanity is down, we can keep retrying.
  constructor(error: unknown, context: ContextWithJobs) {
    this.context = context
  }
}

export default function persistJobsAndCreatePTDs(context: ContextWithJobs) {
  const { transaction, PTDs } = getTransaction(context)

  return pipe(
    Effect.tryPromise({
      try: () =>
        transaction.commit({
          returnDocuments: false,
          autoGenerateArrayKeys: true,
        }),
      catch: (error) => new PersistJobsAndCreatePTDsError(error, context),
    }),
    Effect.map(() => PTDs),
    Effect.tap(() =>
      Effect.logInfo(
        '[persistJobsAndCreatePTDs] Successfully created Phrase jobs',
      ),
    ),
    Effect.withLogSpan('persistJobsAndCreatePTDs'),
  )
}

function getTransaction({
  request,
  project,
  jobs,
  freshDocuments,
  freshDocumentsById,
}: ContextWithJobs) {
  const { paths, sourceDoc } = request
  const freshSourceDoc = freshDocumentsById[sourceDoc._id]
  const PTDs = createPTDs({
    ...request,
    project,
    jobs,
    freshSourceDoc,
    freshDocuments,
  })

  const transaction = request.sanityClient.transaction()

  PTDs.forEach((doc) => transaction.createOrReplace(doc))

  Object.keys(freshDocumentsById).forEach((id) => {
    // And mark this translation as CREATED for each of the source & target documents
    transaction.patch(id, (patch) => {
      patch.setIfMissing({
        phraseMeta: {
          _type: 'phrase.main.meta',
          translations: [],
        },
      } as Pick<SanityDocumentWithPhraseMetadata, 'phraseMeta'>)

      const translationKey = getTranslationKey(paths, sourceDoc._rev)
      const basePath = `phraseMeta.translations[_key == "${translationKey}"]`
      return patch.set({
        [`${basePath}.status`]: 'CREATED',
        [`${basePath}.projectUid`]: project.uid,
        [`${basePath}.targetLangs`]: project.targetLangs,
      })
    })
  })

  return { transaction, PTDs }
}
