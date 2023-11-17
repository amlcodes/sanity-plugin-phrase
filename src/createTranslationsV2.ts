import { Effect, pipe } from 'effect'
import { EffectfulPhraseClient } from './EffectfulPhraseClient'
import getOrCreateTranslatedDocuments from './getOrCreateTranslatedDocuments'
import { CreateTranslationsInput } from './types'
import isDocLocked, { DocumentsLockedError } from './isDocLocked'
import isRevTheSame from './isRevTheSame'
import lockDocuments from './lockDocuments'
import createPhraseProject from './createPhraseProject'
import createPhraseJobs from './createPhraseJobs'
import persistJobsAndCreatePTDs from './persistJobsAndCreatePTDs'
import {
  retrySchedule,
  createResponse,
  runEffectWithClients,
} from './createTranslationHelpers'
import { formatRequest } from './createTranslationHelpers'

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
            Effect.retry(createPhraseProject(data.request), retrySchedule),
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
    // Effect.catchTag('FailedCreatingPhraseProject', error => // undoLockDocuments),
    // Effect.catchTag('FailedCreatingPhraseJob', error => // undoProjectCreation),
    // Effect.catchTag('PersistJobsAndCreatePTDs', error => // salvageCreatedJobs),
  )

  return Effect.runPromise(
    runEffectWithClients(inputRequest, withErrorRecovery),
  )
}
