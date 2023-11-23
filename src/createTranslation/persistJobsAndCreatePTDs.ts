import { Effect, pipe } from 'effect'
import {
  ContextWithJobs,
  CreatedMainDocMetadata,
  SanityDocumentWithPhraseMetadata,
} from '~/types'
import { tPathInMainDoc } from '~/utils'
import { createPTDs } from './createPTDs'
import { createTMD } from './createTMD'

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
      Effect.logInfo('[persistJobsAndCreatePTDs] Successfully created PTDs'),
    ),
    Effect.withLogSpan('persistJobsAndCreatePTDs'),
  )
}

function getTransaction(context: ContextWithJobs) {
  const { request, freshDocumentsById } = context
  const PTDs = createPTDs(context)
  const TMD = createTMD(context)

  const transaction = request.sanityClient.transaction()

  transaction.createOrReplace(TMD)

  PTDs.forEach((doc) => transaction.createOrReplace(doc))

  Object.keys(freshDocumentsById).forEach((id) => {
    // And mark this translation as CREATED for each of the source & target documents
    transaction.patch(id, (patch) => {
      patch.setIfMissing({
        phraseMetadata: {
          _type: 'phrase.main.meta',
          translations: [],
        },
      } as Pick<SanityDocumentWithPhraseMetadata, 'phraseMetadata'>)

      const basePath = tPathInMainDoc(request.translationKey)

      const updatedData: Pick<
        CreatedMainDocMetadata,
        'status' | 'targetLangs' | 'tmd'
      > = {
        [`${basePath}.status` as 'status']: 'CREATED',
        [`${basePath}.targetLangs` as 'targetLangs']: request.targetLangs,
        [`${basePath}.tmd` as 'tmd']: {
          _ref: TMD._id,
          _type: 'reference',
        },
      }

      return (
        patch
          .set(updatedData)
          // in case this is a retry, remove the properties from FailedPersistingMainDocMetadata
          .unset([`${basePath}.jobs`, `${basePath}.project`])
      )
    })
  })

  return { transaction, PTDs }
}
