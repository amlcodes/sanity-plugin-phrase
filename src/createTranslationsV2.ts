import { Effect, pipe } from 'effect'
import { EffectfulPhraseClient } from './EffectfulPhraseClient'
import createPhraseJobs from './createPhraseJobs'
import createPhraseProject from './createPhraseProject'
import {
  formatRequest,
  retrySchedule,
  runEffectWithClients,
} from './createTranslationHelpers'
import getOrCreateTranslatedDocuments from './getOrCreateTranslatedDocuments'
import isDocLocked, { DocumentsLockedError } from './isDocLocked'
import isRevTheSame from './isRevTheSame'
import lockDocuments from './lockDocuments'
import persistJobsAndCreatePTDs from './persistJobsAndCreatePTDs'
import salvageCreatedJobs from './salvageCreatedJobs'
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
        // #1 get fresh content & ensure translated documents are there
        getOrCreateTranslatedDocuments(request),

        // #2 ensure revs match - prohibit translations for content that has changed
        Effect.flatMap(({ freshDocuments, freshDocumentsById }) => {
          const revsMatch = isRevTheSame({ ...request, freshDocuments })
          return revsMatch === true
            ? Effect.succeed({ freshDocuments, freshDocumentsById })
            : Effect.fail(revsMatch)
        }),

        // #3 ensure there aren't any conflicting translations
        Effect.flatMap(({ freshDocuments, freshDocumentsById }) => {
          const isLocked = isDocLocked({ ...request, freshDocuments })
          return isLocked
            ? Effect.fail(new DocumentsLockedError())
            : Effect.succeed({ freshDocuments, freshDocumentsById, request })
        }),

        // #4 lock documents to prevent concurrent translations
        Effect.tap((data) => Effect.retry(lockDocuments(data), retrySchedule)),

        // #5 create Phrase project
        Effect.flatMap((data) =>
          pipe(
            Effect.retry(createPhraseProject(data), retrySchedule),
            Effect.map((project) => ({
              ...data,
              project,
            })),
          ),
        ),

        // #6 create jobs with the source content to be translated
        Effect.flatMap((data) =>
          pipe(
            Effect.retry(createPhraseJobs(data), retrySchedule),
            Effect.map((jobs) => ({
              ...data,
              jobs,
            })),
          ),
        ),

        // #7 persist jobs and create PTD documents in Sanity
        Effect.flatMap((data) =>
          pipe(
            Effect.retry(persistJobsAndCreatePTDs(data), retrySchedule),
            Effect.map((PTDs) => ({
              ...data,
              PTDs,
            })),
          ),
        ),

        // #8 translation successfully created!
        Effect.map(
          () =>
            ({
              body: { message: 'Translations created' },
              status: 200,
            }) as const,
        ),
      )
    }),
  )

  const withErrorRecovery = successfulPath.pipe(
    Effect.catchTags({
      AdapterFailedQueryingError: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 500 } as const),
      RevMismatchError: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 400 } as const),
      DocumentsLockedError: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 400 } as const),
      FailedLockingError: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 500 } as const),
    }),
    Effect.catchTag('FailedCreatingPhraseProject', (error) =>
      pipe(
        Effect.retry(undoLock(error.context), retrySchedule),
        Effect.map(
          () => ({ body: { error: error._tag }, status: 500 }) as const,
        ),
        Effect.catchTag('FailedUnlockingError', (e) =>
          Effect.succeed({
            body: { error: `FailedCreatingPhraseProject/${e._tag}` },
            status: 500,
          } as const),
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
        Effect.map(
          () => ({ body: { error: error._tag }, status: 500 }) as const,
        ),
        Effect.catchTag('FailedUnlockingError', (e) =>
          Effect.succeed({
            body: { error: `${error}/${e._tag}` },
            status: 500,
          } as const),
        ),
        Effect.catchTag('FailedDeletingProjectError', (e) =>
          Effect.succeed({
            status: 500,
            body: { error: `${error}/${e._tag}` },
          } as const),
        ),
      ),
    ),
    Effect.catchTag('PersistJobsAndCreatePTDs', (error) =>
      pipe(
        Effect.retry(salvageCreatedJobs(error.context), retrySchedule),
        Effect.map(
          () => ({ status: 500, body: { error: error._tag } }) as const,
        ),
        Effect.catchTag('FailedSalvagingJobsError', (e) =>
          Effect.succeed({
            status: 500,
            body: { error: `${error._tag}/${e._tag}` },
          } as const),
        ),
      ),
    ),
  )

  return Effect.runPromise(
    runEffectWithClients(inputRequest, withErrorRecovery),
  )
}
