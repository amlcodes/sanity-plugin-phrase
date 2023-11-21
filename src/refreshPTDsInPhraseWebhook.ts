import { SanityClient } from 'sanity'
import refreshPTDs from './refreshPTDs'
import {
  Phrase,
  PhraseCredentialsInput,
  SanityDocumentWithPhraseMetadata,
} from './types'
import { dedupeArray, jobComesFromSanity } from './utils'

export default async function refreshPTDsInPhraseWebhook(inputRequest: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  jobsInWebhook: Phrase['JobInWebhook'][]
}) {
  const jobs = inputRequest.jobsInWebhook.filter(jobComesFromSanity)

  if (jobs.length === 0) {
    return {
      body: { message: 'No jobs from Sanity to parse' },
      status: 200,
    } as const
  }

  const projectUids = dedupeArray(
    jobs.flatMap((jobPart) => jobPart.project?.uid || []),
  )

  const PTDs = await inputRequest.sanityClient
    .fetch<SanityDocumentWithPhraseMetadata[]>(
      /* groq */ `*[
      phraseMeta.projectUid in $projectUids &&
      count(phraseMeta.jobs[uid in $jobUids]) > 0
    ]`,
      {
        projectUids,
        jobUids: jobs.map((jobPart) => jobPart.uid),
      },
    )
    .catch(() => false as const)

  if (PTDs === false) {
    return {
      body: { message: "Couldn't fetch PTDs from Sanity" },
      status: 500,
    } as const
  }

  if (PTDs.length === 0) {
    return {
      body: { message: 'No jobs found in Sanity' },
      status: 200,
    } as const
  }

  return refreshPTDs({ ...inputRequest, docs: PTDs })
}
