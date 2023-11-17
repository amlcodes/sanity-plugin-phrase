import { Effect, pipe } from 'effect'
import {
  Phrase,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from './types'
import { getTranslationName, langAdapter } from './utils'
import getDataToTranslate from './getDataToTranslate'

class FailedCreatingPhraseJobError {
  readonly _tag = 'FailedCreatingPhraseJob'
  // @TODO fine grained errors
  constructor(error: unknown) {}
}

export default function createPhraseJobs({
  request,
  project,
  freshDocumentsById,
}: {
  request: TranslationRequest
  project: Phrase['CreatedProject']
  freshDocumentsById: Record<string, SanityDocumentWithPhraseMetadata>
}) {
  const { filename } = getTranslationName(request)

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.jobs.create({
          projectUid: project.uid,
          filename,
          targetLangs: langAdapter.crossSystemToPhrase(request.targetLangs),
          dataToTranslate: getDataToTranslate({
            ...request,
            freshDocumentsById: freshDocumentsById,
          }),
        }),
      catch: (error) => new FailedCreatingPhraseJobError(error),
    }),
    Effect.flatMap((res) => {
      if (!res.ok || !res.data.jobs) {
        return Effect.fail(new FailedCreatingPhraseJobError(res))
      }

      return Effect.succeed(res.data.jobs)
    }),
    Effect.tap(() =>
      Effect.logInfo('[createPhraseJobs] Successfully created Phrase jobs'),
    ),
    Effect.withLogSpan('createPhraseJobs'),
  )
}
