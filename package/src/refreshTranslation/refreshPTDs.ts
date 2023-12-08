import { Transaction } from '@sanity/client'
import { Effect, pipe } from 'effect'
import { SanityClient } from 'sanity'
import { diffPatch } from 'sanity-diff-patch'
import { retrySchedule } from '../backendHelpers'
import { EffectfulPhraseClient } from '../clients/EffectfulPhraseClient'
import { PhraseClient } from '../clients/createPhraseClient'
import { runEffectWithClients } from '../createTranslation/createTranslationHelpers'
import phraseDocumentToSanityDocument from '../phraseDocumentToSanityDocument'
import {
  ContentInPhrase,
  CrossSystemLangCode,
  Phrase,
  PhraseCredentialsInput,
  PhraseJobInfo,
  PhrasePluginOptions,
  SanityPTDWithExpandedMetadata,
  SanityTMD,
} from '../types'
import { getLastValidJobInWorkflow } from '../utils/phrase'
import { langsAreTheSame } from '../utils'

class FailedDownloadingPhraseDataError {
  readonly _tag = 'FailedDownloadingPhraseData'

  constructor(readonly error: unknown) {}
}

class FailedUpdatingPTDsAndTMDError {
  readonly _tag = 'FailedUpdatingPTDsAndTMD'

  constructor(
    readonly error: unknown,
    readonly transaction: Transaction,
  ) {
    console.error({
      error: 'FailedUpdatingPTDsAndTMD',
      attemptedTx: transaction.toJSON(),
    })
  }
}

class FailedConvertingPhraseContentToSanityDocumentError {
  readonly _tag = 'FailedConvertingPhraseContentToSanityDocument'

  constructor(readonly error: unknown) {
    console.error('\n[FailedConvertingPhraseContentToSanityDocument]', error)
  }
}

export default function refreshPTDs(input: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  PTDs: SanityPTDWithExpandedMetadata[]
  jobsInWebhook?: Phrase['JobInWebhook'][]
  pluginOptions: PhrasePluginOptions
}) {
  const { PTDs, sanityClient } = input

  // For each PTD, find the last job in the workflow - that's the freshest preview possible
  const jobsToRefreshData = PTDs.reduce(
    (acc, doc) => {
      const metadataForLang = doc.phraseMetadata.expandedTMD?.targets.find(
        (t) => langsAreTheSame(t.lang, doc.phraseMetadata.targetLang),
      )
      if (!doc.phraseMetadata.expandedTMD || !metadataForLang?.jobs) return acc

      const lastJobInWorkflow = getLastValidJobInWorkflow(metadataForLang.jobs)
      if (!lastJobInWorkflow?.uid) return acc

      return {
        ...acc,
        [lastJobInWorkflow.uid]: {
          ...(acc[lastJobInWorkflow.uid] || {}),
          phraseProjectUid: doc.phraseMetadata.expandedTMD.phraseProjectUid,
          targetLang: metadataForLang.lang,
          ptdIds: [...(acc[lastJobInWorkflow.uid]?.ptdIds || []), doc._id],
        },
      }
    },
    {} as {
      [jobUid: string]: {
        phraseProjectUid: string
        targetLang: CrossSystemLangCode
        ptdIds: string[]
      }
    },
  )

  function getFreshJobData(phraseClient: PhraseClient) {
    return Object.entries(jobsToRefreshData).map(
      ([jobUid, { phraseProjectUid, targetLang, ptdIds }]) =>
        pipe(
          Effect.retry(
            Effect.tryPromise({
              try: () =>
                phraseClient.jobs.getPreview({
                  projectUid: phraseProjectUid,
                  jobUid,
                }),
              catch: (error) => new FailedDownloadingPhraseDataError(error),
            }),
            retrySchedule,
          ),
          Effect.map((contentInPhrase) => ({
            contentInPhrase,
            phraseProjectUid,
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
      pipe(
        Effect.all(
          PTDs.map((doc) =>
            diffPTD({
              doc,
              refreshedJobData,
              sanityClient,
              pluginOptions: input.pluginOptions,
            }),
          ),
        ),
        Effect.flatMap((PTDsToUpdate) => {
          const transaction = sanityClient.transaction()

          PTDsToUpdate.forEach(({ patches, originalDoc }) => {
            for (const { patch } of patches) {
              transaction.patch(patch.id, patch)
            }

            const metadataPatches = diffTMD(originalDoc, input.jobsInWebhook)
            for (const { patch } of metadataPatches) {
              transaction.patch(patch.id, patch)
            }
          })

          return Effect.tryPromise({
            try: () =>
              transaction.commit({ returnDocuments: false }).then((tx) => ({
                ...tx,
                transactionJson: transaction.toJSON(),
              })),
            catch: (error) =>
              new FailedUpdatingPTDsAndTMDError(error, transaction),
          })
        }),
      ),
    ),
    Effect.map(
      (tx) =>
        ({
          body: {
            message: 'PTDs updated',
            transactionId: tx.transactionId,
            transacted: tx.transactionJson,
          },
          status: 200,
        }) as const,
    ),
  )

  const withErrorRecovery = successfulPath.pipe(
    Effect.catchTags({
      FailedDownloadingPhraseData: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 500 } as const),
      FailedUpdatingPTDsAndTMD: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 500 } as const),
      FailedConvertingPhraseContentToSanityDocument: (error) =>
        Effect.succeed({ body: { error: error._tag }, status: 500 } as const),
    }),
  )

  return Effect.runPromise(runEffectWithClients(input, withErrorRecovery))
}

function diffPTD({
  doc,
  refreshedJobData,
  sanityClient,
  pluginOptions,
}: {
  doc: SanityPTDWithExpandedMetadata
  refreshedJobData: {
    contentInPhrase: ContentInPhrase
    phraseProjectUid: string
    targetLang: CrossSystemLangCode
    jobUid: string
    ptdIds: string[]
  }[]
  sanityClient: SanityClient
  pluginOptions: PhrasePluginOptions
}) {
  const phraseDoc = refreshedJobData.find((job) => job.ptdIds.includes(doc._id))
    ?.contentInPhrase

  if (!phraseDoc)
    return Effect.succeed({
      originalDoc: doc,
      finalDoc: doc,
      patches: [],
    })

  return pipe(
    Effect.tryPromise({
      try: () =>
        phraseDocumentToSanityDocument({
          contentInPhrase: phraseDoc,
          freshPTD: doc,
          sanityClient,
          pluginOptions,
        }),
      catch: (error) =>
        new FailedConvertingPhraseContentToSanityDocumentError(error),
    }),
    Effect.map((updatedContent) => {
      const updatedDoc = pluginOptions.i18nAdapter.injectDocumentLang(
        {
          ...updatedContent,
          phraseMetadata: undefined,
        },
        (doc.phraseMetadata?._type === 'phrase.ptd.meta'
          ? doc.phraseMetadata.targetLang.sanity
          : pluginOptions.i18nAdapter.getDocumentLang(doc)) as string,
      )

      return {
        originalDoc: doc,
        updatedDoc: updatedDoc,
        patches: diffPatch({ ...doc, phraseMetadata: undefined }, updatedDoc),
      }
    }),
  )
}

function diffTMD(
  doc: SanityPTDWithExpandedMetadata,
  jobsInWebhook?: Phrase['JobInWebhook'][],
) {
  const currentMetadata = doc.phraseMetadata.expandedTMD

  if (!currentMetadata) return []

  const newMetadata: SanityTMD = {
    ...currentMetadata,
    targets: currentMetadata.targets.map((target) => {
      if (target.lang.sanity !== doc.phraseMetadata.targetLang.sanity)
        return target

      return {
        ...target,
        jobs: target.jobs.map((job) => updateJobInTMD(job, jobsInWebhook)),
      }
    }),
  }

  return diffPatch(currentMetadata, newMetadata)
}

function updateJobInTMD(
  jobInMeta: PhraseJobInfo,
  updatedJobs?: Phrase['JobInWebhook'][],
) {
  const freshJob = updatedJobs?.find((j) => j.uid === jobInMeta.uid)
  if (!freshJob) return jobInMeta

  return {
    ...jobInMeta,
    status: freshJob.status,
    dateDue: freshJob.dateDue,
    dateCreated: freshJob.dateCreated,
    workflowLevel: freshJob.workflowLevel,
    workflowStep: freshJob.workflowStep || jobInMeta.workflowStep,
    providers: freshJob.providers || jobInMeta.providers,
  }
}

export const PTDWithExpandedDataQuery = /* groq */ `
...,
"expandedTMD": tmd->,
"expandedTarget": *[_id in [^.targetDoc._ref, "drafts." + ^.targetDoc._ref]]|order(_updatedAt)[0],
`
