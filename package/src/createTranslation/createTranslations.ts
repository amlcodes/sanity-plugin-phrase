import { Effect, pipe } from 'effect'
import { retrySchedule } from '../backendHelpers'
import { EffectfulPhraseClient } from '../clients/EffectfulPhraseClient'
import { CreateTranslationsInput } from '../types'
import createPhraseJobs from './createPhraseJobs'
import createPhraseProject from './createPhraseProject'
import { formatRequest } from './createTranslationHelpers'
import getOrCreateTranslatedDocuments from './getOrCreateTranslatedDocuments'
import isDocLocked, { DocumentsLockedError } from './isDocLocked'
import isRevTheSame from './isRevTheSame'
import lockDocuments from './lockDocuments'
import persistJobsAndCreatePTDs from './persistJobsAndCreatePTDs'
import salvageCreatedJobs from './salvageCreatedJobs'
import undoLock from './undoLock'
import undoPhraseProjectCreation from './undoPhraseProjectCreation'

export default function createTranslations(input: CreateTranslationsInput) {
  const successfulPath = Effect.all([EffectfulPhraseClient]).pipe(
    Effect.flatMap(([phraseClient]) => {
      const request = formatRequest(input, phraseClient)

      return pipe(
        // #1 get fresh content & ensure translated documents are there
        getOrCreateTranslatedDocuments(request),

        // #2 ensure revs match - prohibit translations for content that has changed
        Effect.flatMap((context) => {
          const revsMatch = isRevTheSame(context)
          return revsMatch === true
            ? Effect.succeed(context)
            : Effect.fail(revsMatch)
        }),

        // #3 ensure there aren't any conflicting translations
        Effect.filterOrFail(isDocLocked, () => new DocumentsLockedError()),

        // #4 lock documents to prevent concurrent translations
        Effect.tap(lockDocuments),

        // #5 create Phrase project
        Effect.flatMap((context) =>
          pipe(
            Effect.retry(createPhraseProject(context), retrySchedule),
            Effect.map((project) => ({
              ...context,
              project,
            })),
          ),
        ),

        // #6 create jobs with the source content to be translated
        Effect.flatMap((context) =>
          pipe(
            Effect.retry(createPhraseJobs(context), retrySchedule),
            Effect.map((jobs) => ({
              ...context,
              jobs,
            })),
          ),
        ),

        // #7 persist jobs and create PTD documents in Sanity
        Effect.flatMap((context) =>
          pipe(
            Effect.retry(persistJobsAndCreatePTDs(context), retrySchedule),
            Effect.map((PTDs) => ({
              ...context,
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
        Effect.succeed({
          body: { error: error._tag },
          status: 500,
        } as const),
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

  return withErrorRecovery
}
