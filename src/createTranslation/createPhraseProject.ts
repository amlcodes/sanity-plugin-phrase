import { Effect, pipe } from 'effect'
import { ContextWithFreshDocuments, Phrase } from '~/types'
import { langAdapter } from '~/utils'

class FailedCreatingPhraseProjectError {
  readonly context: ContextWithFreshDocuments
  readonly _tag = 'FailedCreatingPhraseProject'

  // @TODO fine-grained errors
  constructor(res: unknown, context: ContextWithFreshDocuments) {
    this.context = context
  }
}

export default function createPhraseProject(
  context: ContextWithFreshDocuments,
) {
  const { request } = context

  return pipe(
    Effect.tryPromise({
      try: () =>
        request.phraseClient.projects.create({
          name: context.translationName,
          templateUid: request.templateUid,
          targetLangs: langAdapter.crossSystemToPhrase(request.targetLangs),
          sourceLang: request.sourceDoc.lang.phrase,
          dateDue: request.dateDue,
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
