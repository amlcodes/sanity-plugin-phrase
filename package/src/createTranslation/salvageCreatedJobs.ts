import { Effect, pipe } from 'effect'
import { ContextWithJobs, SanityTMD } from '../types'

class FailedSalvagingJobsError {
  readonly _tag = 'FailedSalvagingJobsError'
  constructor(readonly error: unknown) {}
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
  activeTMD,
}: ContextWithJobs) {
  const transaction = request.sanityClient.transaction()

  transaction.patch(activeTMD._id, (patch) => {
    const updatedData: Pick<
      SanityTMD<'FAILED_PERSISTING'>,
      'status' | 'salvaged'
    > = {
      status: 'FAILED_PERSISTING',
      salvaged: {
        jobs,
        project,
      },
    }
    return patch.set(updatedData)
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
