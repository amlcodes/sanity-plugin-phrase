import { Effect, pipe } from 'effect'
import getContentInPhrase from './getContentInPhrase'
import { ContextWithProject } from '../types'

class FailedCreatingPhraseJobsError {
  readonly _tag = 'FailedCreatingPhraseJobs'

  constructor(
    readonly error: unknown,
    readonly context: ContextWithProject,
  ) {}
}

export default function createPhraseJobs(context: ContextWithProject) {
  const { request, project } = context

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.jobs.create({
          projectUid: project.uid,
          filename: request.translationFilename,
          targetLangs: request.pluginOptions.langAdapter.crossSystemToPhrase(
            request.targetLangs,
          ),
          dataToTranslate: getContentInPhrase(context),
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
