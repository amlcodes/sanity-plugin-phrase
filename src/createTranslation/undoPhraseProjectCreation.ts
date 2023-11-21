import { Effect, pipe } from 'effect'
import { ContextWithProject } from '~/types'

class FailedDeletingProjectError {
  readonly _tag = 'FailedDeletingProjectError'
  constructor(error: unknown) {}
}

/**
 * Ran after an error creating jobs in Phrase.
 *
 * We need to delete the created project so the user can try again without polluting their Phrase dashboard.
 */
export default function undoPhraseProjectCreation(context: ContextWithProject) {
  return pipe(
    Effect.tryPromise({
      try: () =>
        context.request.phraseClient.projects.delete({
          projectUid: context.project.uid,
        }),
      catch: (error) => new FailedDeletingProjectError(error),
    }),
    Effect.tap(() =>
      Effect.logInfo(
        '[undoPhraseProjectCreation] Successfully deleted Phrase project',
      ),
    ),
    Effect.withLogSpan('undoPhraseProjectCreation'),
  )
}
