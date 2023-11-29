import { Effect, pipe } from 'effect'
import getDataToTranslate from './getDataToTranslate'
import { ContextWithProject } from '../types'

class FailedCreatingPhraseJobsError {
  readonly _tag = 'FailedCreatingPhraseJobs'

  constructor(
    readonly error: unknown,
    readonly context: ContextWithProject,
  ) {}
}

export default function createPhraseJobs(context: ContextWithProject) {
  const { request, project, freshDocumentsById } = context

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.jobs.create({
          projectUid: project.uid,
          filename: request.translationFilename,
          targetLangs: request.pluginOptions.langAdapter.crossSystemToPhrase(
            request.targetLangs,
          ),
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
