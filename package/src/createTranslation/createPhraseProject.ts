import { Effect, pipe } from 'effect'
import { ContextWithFreshDocuments, Phrase } from '../types'
import { prepareDateForPhrase } from '../utils'

class FailedCreatingPhraseProjectError {
  readonly _tag = 'FailedCreatingPhraseProject'

  constructor(
    readonly res: unknown,
    readonly context: ContextWithFreshDocuments,
  ) {}
}

export default function createPhraseProject(
  context: ContextWithFreshDocuments,
) {
  const { request } = context

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.projects.create({
          name: request.translationName,
          templateUid: request.templateUid,
          targetLangs: request.pluginOptions.langAdapter.crossSystemToPhrase(
            request.targetLangs,
          ),
          sourceLang: request.sourceDoc.lang.phrase,
          dateDue: prepareDateForPhrase(request.dateDue),
        }),
      catch: (error) => new FailedCreatingPhraseProjectError(error, context),
    }),
    Effect.flatMap((res) => {
      if (!res.ok || !res.data.uid) {
        return Effect.fail(new FailedCreatingPhraseProjectError(res, context))
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
