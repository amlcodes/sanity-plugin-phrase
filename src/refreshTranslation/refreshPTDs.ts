import { Effect, pipe } from 'effect'
import { SanityClient } from 'sanity'
import { diffPatch } from 'sanity-diff-patch'
import { retrySchedule } from '~/backendHelpers'
import {
  ContentInPhrase,
  CrossSystemLangCode,
  Phrase,
  PhraseCredentialsInput,
  PhraseJobInfo,
  SanityDocumentWithPhraseMetadata,
  SanityPTD,
} from '~/types'
import { i18nAdapter } from '../adapters'
import { EffectfulPhraseClient } from '../clients/EffectfulPhraseClient'
import { PhraseClient } from '../clients/createPhraseClient'
import { runEffectWithClients } from '../createTranslation/createTranslationHelpers'
import phraseDocumentToSanityDocument from '../phraseDocumentToSanityDocument'

export default function refreshPTDs(inputRequest: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  docs: SanityDocumentWithPhraseMetadata[]
}) {
  const PTDs = inputRequest.docs.filter(
    (doc) =>
      doc.phraseMetadata?._type === 'phrase.ptd.meta' &&
      doc.phraseMetadata.jobs?.length,
  ) as SanityPTD[]

  // For each PTD, find the last job in the workflow - that's the freshest preview possible
  const jobsToRefreshData = PTDs.reduce(
    (acc, doc) => {
      const lastJobInWorkflow = sortJobsByWorkflowLevel(
        doc.phraseMetadata.jobs,
      )[0]
      if (!lastJobInWorkflow.uid) return acc

      return {
        ...acc,
        [lastJobInWorkflow.uid]: {
          ...(acc[lastJobInWorkflow.uid] || {}),
          projectUid: doc.phraseMetadata.projectUid,
          targetLang: doc.phraseMetadata.targetLang,
          ptdIds: [...(acc[lastJobInWorkflow.uid]?.ptdIds || []), doc._id],
        },
      }
    },
    {} as {
      [jobUid: string]: {
        projectUid: string
        targetLang: CrossSystemLangCode
        ptdIds: string[]
      }
    },
  )

  function getFreshJobData(phraseClient: PhraseClient) {
    return Object.entries(jobsToRefreshData).map(
      ([jobUid, { projectUid, targetLang, ptdIds }]) =>
        pipe(
          Effect.retry(
            Effect.tryPromise({
              try: () =>
                phraseClient.jobs.getPreview({
                  projectUid,
                  jobUid,
                }),
              catch: () => new Error('@TODO'),
            }),
            retrySchedule,
          ),
          Effect.map((contentInPhrase) => ({
            contentInPhrase,
            projectUid,
            targetLang,
            jobUid,
            ptdIds,
          })),
        ),
    )
  }

  const successfulPath = Effect.all([EffectfulPhraseClient]).pipe(
    Effect.flatMap(([phraseClient]) =>
      Effect.all(getFreshJobData(phraseClient), { concurrency: 3 }),
    ),
    Effect.flatMap((refreshedJobData) =>
      Effect.all(
        PTDs.map((doc) =>
          diffPTD(doc, refreshedJobData, inputRequest.sanityClient),
        ),
      ),
    ),
    Effect.flatMap((PTDsToUpdate) => {
      const transaction = inputRequest.sanityClient.transaction()

      PTDsToUpdate.forEach(({ patches }) => {
        for (const { patch } of patches) {
          transaction.patch(patch.id, patch)
        }
      })

      return Effect.retry(
        Effect.tryPromise({
          try: () => transaction.commit(),
          catch: () => new Error('@todo'),
        }),
        retrySchedule,
      )
    }),
    Effect.map(
      () =>
        ({
          body: { message: 'PTDs updated' },
          status: 200,
        }) as const,
    ),
  )

  const withErrorRecovery = successfulPath.pipe(
    // @Todo handle errors
    Effect.map(
      () =>
        ({
          body: { message: 'PTDs updated' },
          status: 200,
        }) as const,
    ),
  )

  return Effect.runPromise(
    runEffectWithClients(inputRequest, withErrorRecovery),
  )
}

function diffPTD(
  doc: SanityPTD,
  refreshedJobData: {
    contentInPhrase: ContentInPhrase
    projectUid: string
    targetLang: CrossSystemLangCode
    jobUid: string
    ptdIds: string[]
  }[],
  sanityClient: SanityClient,
) {
  const phraseDoc = refreshedJobData.find((job) => job.ptdIds.includes(doc._id))
    ?.contentInPhrase

  if (!phraseDoc)
    return Effect.succeed({
      originalDoc: doc,
      finalDoc: doc,
      patches: [],
    })

  return pipe(
    Effect.retry(
      Effect.tryPromise({
        try: () => phraseDocumentToSanityDocument(phraseDoc, doc),
        catch: () => new Error('@todo'),
      }),
      retrySchedule,
    ),
    Effect.map((updatedContent) => {
      const finalDoc = i18nAdapter.injectDocumentLang(
        {
          ...updatedContent,
          phraseMetadata:
            doc.phraseMetadata?._type === 'phrase.ptd.meta'
              ? {
                  ...doc.phraseMetadata,
                  jobs: doc.phraseMetadata.jobs.map((job) =>
                    updateJobInPtd(job, [] /* @Todo */),
                  ),
                }
              : undefined,
        },
        (doc.phraseMetadata?._type === 'phrase.ptd.meta'
          ? doc.phraseMetadata?.targetLang.sanity
          : i18nAdapter.getDocumentLang(doc)) ||
          // @TODO: how to deal with missing targetLang? Can this ever happen?
          '',
      )

      return {
        originalDoc: doc,
        doc: finalDoc,
        patches: diffPatch(doc, finalDoc),
      }
    }),
  )
}

/** Later steps come first */
function sortJobsByWorkflowLevel(jobs: PhraseJobInfo[]) {
  return jobs.sort((a, b) => {
    if (typeof a.workflowLevel !== 'number') return 1
    if (typeof b.workflowLevel !== 'number') return -1

    return b.workflowLevel - a.workflowLevel
  })
}

function updateJobInPtd(
  jobInPtd: PhraseJobInfo,
  updatedJobs: (Phrase['JobInWebhook'] | PhraseJobInfo)[],
) {
  const freshJob = updatedJobs.find((j) => j.uid === jobInPtd.uid)
  if (!freshJob) return jobInPtd

  return {
    ...jobInPtd,
    status: freshJob.status,
    dateDue: freshJob.dateDue,
    dateCreated: freshJob.dateCreated,
    workflowLevel: freshJob.workflowLevel,
    workflowStep: freshJob.workflowStep || jobInPtd.workflowStep,
    providers: freshJob.providers || jobInPtd.providers,
  }
}
