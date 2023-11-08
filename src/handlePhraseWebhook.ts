import fs from 'fs'
import { diffPatch } from 'sanity-diff-patch'
import createAuthedPhraseClient from './createAuthedPhraseClient'
import { PhraseDatacenterRegion } from './createPhraseClient'
import { i18nAdapter } from './adapters'
import phraseDocumentToSanityDocument from './phraseDocumentToSanityDocument'
import { sanityClient } from './sanityClient'
import {
  ContentInPhrase,
  CrossSystemLangCode,
  Phrase,
  PhraseJobInfo,
  SanityDocumentWithPhraseMetadata,
} from './types'
import { dedupeArray, jobComesFromSanity } from './utils'

type JobTargetUpdatedWebhook = {
  event: 'JOB_TARGET_UPDATED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobDeletedWebhook = {
  event: 'JOB_DELETED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobAssignedWebhook = {
  event: 'JOB_ASSIGNED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobCreatedWebhook = {
  event: 'JOB_CREATED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobStatusChangedWebhook = {
  event: 'JOB_STATUS_CHANGED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type PhraseWebhook =
  | JobTargetUpdatedWebhook
  | JobDeletedWebhook
  | JobAssignedWebhook
  | JobCreatedWebhook
  | JobStatusChangedWebhook

function updateJobInPtd(
  jobInPtd: PhraseJobInfo,
  updatedJobs: Phrase['JobInWebhook'][],
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

export default async function handlePhraseWebhook(
  region: PhraseDatacenterRegion,
  payload: PhraseWebhook,
) {
  const phraseClient = await createAuthedPhraseClient(region)
  if (
    !payload.event ||
    !(
      [
        'JOB_ASSIGNED',
        'JOB_TARGET_UPDATED',
        'JOB_STATUS_CHANGED',
        'JOB_CREATED',
        'JOB_DELETED',
      ] as PhraseWebhook['event'][]
    ).includes(payload.event)
  ) {
    return 'Invalid webhook payload or ignored event'
  }

  if (payload.event === 'JOB_CREATED') {
    // @TODO: do we need to deal with creations or can we depend entirely on `createPTDs`?
    return
  }

  if (payload.event === 'JOB_DELETED') {
    // @TODO: deal with deletions - probably marking status as DELETED_IN_PHRASE
    return
  }

  const { jobParts: allJobParts = [] } = payload

  // Don't include jobs not coming from Sanity
  const jobs = allJobParts.filter(jobComesFromSanity)

  if (jobs.length === 0) {
    // @TODO: how to do early returns?
    return
  }

  const projectUids = dedupeArray(
    jobs.flatMap((jobPart) => jobPart.project?.uid || []),
  )

  const PTDs = await sanityClient.fetch<SanityDocumentWithPhraseMetadata[]>(
    /* groq */ `*[
      phraseMeta.projectUid in $projectUids &&
      count(phraseMeta.jobs[uid in $jobUids]) > 0
    ]`,
    {
      projectUids,
      jobUids: jobs.map((jobPart) => jobPart.uid),
    },
  )

  // If not PTDs to update, return early
  if (PTDs.length === 0) {
    return
  }

  // For each PTD, find the last job in the workflow - that's the freshest preview possible
  const jobsToRefreshData = PTDs.reduce((acc, doc) => {
    if (
      doc.phraseMeta?._type !== 'phrase.ptd.meta' ||
      !doc.phraseMeta.jobs?.length
    )
      return acc

    const lastJobInWorkflow = sortJobsByWorkflowLevel(doc.phraseMeta.jobs)[0]
    if (!lastJobInWorkflow.uid) return acc

    return {
      ...acc,
      [lastJobInWorkflow.uid]: {
        ...(acc[lastJobInWorkflow.uid] || {}),
        projectUid: doc.phraseMeta.projectUid,
        targetLang: doc.phraseMeta.targetLang,
        ptdIds: [...(acc[lastJobInWorkflow.uid]?.ptdIds || []), doc._id],
      },
    }
  }, {} as { [jobUid: string]: { projectUid: string; targetLang: CrossSystemLangCode; ptdIds: string[] } })

  const refreshedJobData = await Promise.all(
    Object.entries(jobsToRefreshData).map(
      ([jobUid, { projectUid, targetLang, ptdIds }]) =>
        new Promise<{
          contentInPhrase: ContentInPhrase
          jobUid: string
          projectUid: string
          targetLang: CrossSystemLangCode
          ptdIds: string[]
        }>(async (resolve, reject) => {
          try {
            const contentInPhrase = await phraseClient.jobs.getPreview({
              projectUid,
              jobUid,
            })
            resolve({
              contentInPhrase,
              projectUid,
              targetLang,
              jobUid,
              ptdIds,
            })
          } catch (e) {
            reject(e)
          }
        }),
    ),
  )

  const PTDsToUpdate = PTDs.map((doc) => {
    const phraseDoc = refreshedJobData.find((job) =>
      job.ptdIds.includes(doc._id),
    )?.contentInPhrase

    const updatedContent = phraseDoc
      ? phraseDocumentToSanityDocument(phraseDoc, doc)
      : doc

    const finalDoc = i18nAdapter.injectDocumentLang(
      {
        ...updatedContent,
        phraseMeta:
          doc.phraseMeta?._type === 'phrase.ptd.meta'
            ? {
                ...doc.phraseMeta,
                jobs: doc.phraseMeta.jobs.map((job) =>
                  updateJobInPtd(job, jobs),
                ),
              }
            : undefined,
      },
      (doc.phraseMeta as any)?.targetLang ||
        i18nAdapter.getDocumentLang(doc) ||
        undefined,
    )

    return {
      originalDoc: doc,
      doc: finalDoc,
      patches: diffPatch(doc, finalDoc),
    }
  })

  const transaction = sanityClient.transaction()

  PTDsToUpdate.forEach(({ patches }) => {
    for (const { patch } of patches) {
      transaction.patch(patch.id, patch)
    }
  })

  const res = await transaction.commit()

  fs.writeFileSync(
    'example-data/gitignored/fetchedPTDs.json',
    JSON.stringify(PTDs, null, 2),
  )
  fs.writeFileSync(
    'example-data/gitignored/updatedPTDs.json',
    JSON.stringify(PTDsToUpdate, null, 2),
  )
  fs.writeFileSync(
    'example-data/gitignored/refreshedJobData.json',
    JSON.stringify(refreshedJobData, null, 2),
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
