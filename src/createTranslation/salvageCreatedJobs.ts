import { Effect, pipe } from 'effect'
import { ContextWithJobs, FailedPersistingMainDocMetadata } from '~/types'
import { getTranslationKey, tPathInMainDoc } from '~/utils'

class FailedSalvagingJobsError {
  readonly _tag = 'FailedSalvagingJobsError'
  constructor(error: unknown) {}
}

/**
 * Ran after we've created the project and translation jobs in Phrase, but couldn't `persistJobsAndCreatePTDs`.
 *
 * As Phrase charges for *created* jobs for the ingested & processed content, we can't simply delete them.
 * Instead, we save the project & jobs information in the source document in Sanity and retry the `persistJobsAndCreatePTDs` step.
 */
export default function salvageCreatedJobs({
  request,
  project,
  jobs,
  freshDocumentsById,
}: ContextWithJobs) {
  const { sourceDoc } = request
  const transaction = request.sanityClient.transaction()
  const translationKey = getTranslationKey(request.paths, sourceDoc._rev)
  const basePath = tPathInMainDoc(translationKey)

  Object.keys(freshDocumentsById).forEach((id) => {
    transaction.patch(id, (patch) => {
      const updatedData: Pick<
        FailedPersistingMainDocMetadata,
        'status' | 'project' | 'jobs'
      > = {
        [`${basePath}.status` as 'status']: 'FAILED_PERSISTING',
        [`${basePath}.jobs` as 'jobs']: jobs,
        [`${basePath}.project` as 'project']: project,
      }
      return patch.set(updatedData)
    })
  })

  return pipe(
    Effect.tryPromise({
      try: () =>
        transaction.commit({
          returnDocuments: false,
          autoGenerateArrayKeys: true,
        }),
      catch: (error) => new FailedSalvagingJobsError(error),
    }),
    Effect.tap(() =>
      Effect.logInfo(
        '[salvageCreatedJobs] Successfully saved created jobs & projects for future retries',
      ),
    ),
    Effect.withLogSpan('salvageCreatedJobs'),
  )
}
