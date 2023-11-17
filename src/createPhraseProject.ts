import { Effect, pipe } from 'effect'
import { Phrase, TranslationRequest } from './types'
import { getTranslationName, langAdapter } from './utils'

class FailedCreatingPhraseProjectError {
  readonly _tag = 'FailedCreatingPhraseProject'
  // @TODO fine-grained errors
  constructor(res: unknown) {}
}

export default function createPhraseProject(request: TranslationRequest) {
  const { name: translationName } = getTranslationName(request)

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.projects.create({
          name: translationName,
          templateUid: request.templateUid,
          targetLangs: langAdapter.crossSystemToPhrase(request.targetLangs),
          sourceLang: request.sourceDoc.lang.phrase,
          dateDue: request.dateDue,
        }),
      catch: (error) => new FailedCreatingPhraseProjectError(error),
    }),
    Effect.flatMap((res) => {
      if (!res.ok || !res.data.uid) {
        return Effect.fail(new FailedCreatingPhraseProjectError(res))
      }

      return Effect.succeed(res.data as Phrase['CreatedProject'])
    }),
    Effect.tap(() =>
      Effect.logInfo(
        '[createPhraseProject] Successfully created Phrase project',
      ),
    ),
    Effect.withLogSpan('createPhraseProject'),
  )
}
