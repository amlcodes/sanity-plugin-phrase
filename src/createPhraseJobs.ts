import { Effect, pipe } from 'effect'
import getDataToTranslate from './getDataToTranslate'
import { ContextWithProject } from './types'
import { langAdapter } from './utils'

class FailedCreatingPhraseJobsError {
  readonly _tag = 'FailedCreatingPhraseJobs'
  readonly context: ContextWithProject

  // @TODO fine grained errors?
  constructor(error: unknown, context: ContextWithProject) {
    this.context = context
  }
}

export default function createPhraseJobs(context: ContextWithProject) {
  const { request, project, freshDocumentsById } = context

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.jobs.create({
          projectUid: project.uid,
          filename: context.translationFilename,
          targetLangs: langAdapter.crossSystemToPhrase(request.targetLangs),
          dataToTranslate: getDataToTranslate({
            ...request,
            freshDocumentsById: freshDocumentsById,
          }),
        }),
      catch: (error) => new FailedCreatingPhraseJobsError(error, context),
    }),
    Effect.flatMap((res) => {
      if (!res.ok || !res.data.jobs) {
        return Effect.fail(new FailedCreatingPhraseJobsError(res, context))
      }

      return Effect.succeed(res.data.jobs)
    }),
    Effect.tap(() =>
      Effect.logInfo('[createPhraseJobs] Successfully created Phrase jobs'),
    ),
    Effect.withLogSpan('createPhraseJobs'),
  )
}
