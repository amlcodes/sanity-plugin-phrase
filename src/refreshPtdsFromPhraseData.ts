// import fs from 'fs'
import { diffPatch } from 'sanity-diff-patch'
import { i18nAdapter } from './adapters'
import { PhraseClient } from './createPhraseClient'
import phraseDocumentToSanityDocument from './phraseDocumentToSanityDocument'
import {
  ContentInPhrase,
  CrossSystemLangCode,
  Phrase,
  PhraseJobInfo,
  PtdPhraseMetadata,
  SanityDocumentWithPhraseMetadata,
} from './types'
import { dedupeArray, jobComesFromSanity } from './utils'
import { SanityClient } from 'sanity'

export default async function refreshPtdsFromPhraseData(
  props: { sanityClient: SanityClient; phraseClient: PhraseClient } & (
    | { jobsInWebhook: Phrase['JobInWebhook'][] }
    | { ptdMetadata: PtdPhraseMetadata }
  ),
) {
  const { sanityClient, phraseClient } = props

  const jobs =
    'jobsInWebhook' in props
      ? // In the webhook payload, exclude jobs not coming from Sanity
        props.jobsInWebhook.filter(jobComesFromSanity)
      : props.ptdMetadata.jobs.map((j) => ({
          ...j,
          filename: props.ptdMetadata.filename,
          project: {
            uid: props.ptdMetadata.projectUid,
          },
        }))

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
            /**
             * @TODO: replace with downloading target file instead of preview
             */
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

  const PTDsToUpdate = await Promise.all(
    PTDs.map(async (doc) => {
      const phraseDoc = refreshedJobData.find((job) =>
        job.ptdIds.includes(doc._id),
      )?.contentInPhrase

      // @TODO: better structure this
      const updatedContent = phraseDoc
        ? await phraseDocumentToSanityDocument(phraseDoc, doc)
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
        (doc.phraseMeta?._type === 'phrase.ptd.meta'
          ? doc.phraseMeta?.targetLang.sanity
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

  const transaction = sanityClient.transaction()

  PTDsToUpdate.forEach(({ patches }) => {
    for (const { patch } of patches) {
      transaction.patch(patch.id, patch)
    }
  })

  const res = await transaction.commit()

  // fs.writeFileSync(
  //   'example-data/gitignored/fetchedPTDs.json',
  //   JSON.stringify(PTDs, null, 2),
  // )
  // fs.writeFileSync(
  //   'example-data/gitignored/updatedPTDs.json',
  //   JSON.stringify(PTDsToUpdate, null, 2),
  // )
  // fs.writeFileSync(
  //   'example-data/gitignored/refreshedJobData.json',
  //   JSON.stringify(refreshedJobData, null, 2),
  // )
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
