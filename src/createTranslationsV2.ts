import { Effect, pipe } from 'effect'
import { EffectfulPhraseClient } from './EffectfulPhraseClient'
import createPhraseJobs from './createPhraseJobs'
import createPhraseProject from './createPhraseProject'
import {
  createResponse,
  formatRequest,
  retrySchedule,
  runEffectWithClients,
} from './createTranslationHelpers'
import getOrCreateTranslatedDocuments from './getOrCreateTranslatedDocuments'
import isDocLocked, { DocumentsLockedError } from './isDocLocked'
import isRevTheSame from './isRevTheSame'
import lockDocuments from './lockDocuments'
import persistJobsAndCreatePTDs from './persistJobsAndCreatePTDs'
import { CreateTranslationsInput } from './types'
import undoLock from './undoLock'
import undoPhraseProjectCreation from './undoPhraseProjectCreation'

export default function createTranslations(
  inputRequest: CreateTranslationsInput,
) {
  const successfulPath = Effect.all([EffectfulPhraseClient]).pipe(
    Effect.flatMap(([phraseClient]) => {
      const request = formatRequest(inputRequest, phraseClient)

      return pipe(
        getOrCreateTranslatedDocuments(request),
        Effect.flatMap(({ freshDocuments, freshDocumentsById }) => {
          const revsMatch = isRevTheSame({ ...request, freshDocuments })
          return revsMatch === true
            ? Effect.succeed({ freshDocuments, freshDocumentsById })
            : Effect.fail(revsMatch)
        }),
        Effect.flatMap(({ freshDocuments, freshDocumentsById }) => {
          const isLocked = isDocLocked({ ...request, freshDocuments })
          return isLocked
            ? Effect.fail(new DocumentsLockedError())
            : Effect.succeed({ freshDocuments, freshDocumentsById, request })
        }),
        Effect.tap(({ freshDocuments }) =>
          Effect.retry(
            lockDocuments({ ...request, freshDocuments }),
            retrySchedule,
          ),
        ),
        Effect.flatMap((data) => {
          return pipe(
            Effect.retry(createPhraseProject(data), retrySchedule),
            Effect.map((project) => ({
              ...data,
              project,
            })),
          )
        }),
        Effect.flatMap((data) => {
          return pipe(
            Effect.retry(createPhraseJobs(data), retrySchedule),
            Effect.map((jobs) => ({
              ...data,
              jobs,
            })),
          )
        }),
        Effect.flatMap((data) => {
          return pipe(
            Effect.retry(persistJobsAndCreatePTDs(data), retrySchedule),
            Effect.map((PTDs) => ({
              ...data,
              PTDs,
            })),
          )
        }),
        Effect.map(() =>
          createResponse({ message: 'Translations created' }, 200),
        ),
      )
    }),
  )

  const withErrorRecovery = successfulPath.pipe(
    Effect.catchTags({
      AdapterFailedQueryingError: (error) =>
        Effect.succeed(createResponse({ error: error._tag }, 500)),
      RevMismatchError: (error) =>
        Effect.succeed(createResponse({ error: error._tag }, 400)),
      DocumentsLockedError: (error) =>
        Effect.succeed(createResponse({ error: error._tag }, 400)),
      FailedLockingError: (error) =>
        Effect.succeed(createResponse({ error: error._tag }, 500)),
    }),
    Effect.catchTag('FailedCreatingPhraseProject', (error) =>
      pipe(
        Effect.retry(undoLock(error.context), retrySchedule),
        Effect.map(() => createResponse({ error: error._tag }, 500)),
        Effect.catchTag('FailedUnlockingError', (e) =>
          Effect.succeed(
            createResponse(
              { error: `FailedCreatingPhraseProject/${e._tag}` },
              500,
            ),
          ),
        ),
      ),
    ),
    Effect.catchTag('FailedCreatingPhraseJobs', (error) =>
      pipe(
        Effect.all(
          [
            Effect.retry(
              undoPhraseProjectCreation(error.context),
              retrySchedule,
            ),
            Effect.retry(undoLock(error.context), retrySchedule),
          ],
          {
            concurrency: 'unbounded',
          },
        ),
        Effect.map(() => createResponse({ error: error._tag }, 500)),
        Effect.catchTag('FailedUnlockingError', (e) =>
          Effect.succeed(
            createResponse(
              { error: `FailedCreatingPhraseJobs/${e._tag}` },
              500,
            ),
          ),
        ),
        Effect.catchTag('FailedDeletingProjectError', (e) =>
          Effect.succeed(
            createResponse(
              { error: `FailedCreatingPhraseJobs/${e._tag}` },
              500,
            ),
          ),
        ),
      ),
    ),
    // Effect.catchTag('PersistJobsAndCreatePTDs', error => // salvageCreatedJobs),
  )

  return Effect.runPromise(
    runEffectWithClients(inputRequest, withErrorRecovery),
  )
}
