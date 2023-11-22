import { SanityClient } from 'sanity'
import { METADATA_KEY, Phrase, SanityDocumentWithPhraseMetadata } from './types'
import { dedupeArray, jobComesFromSanity } from './utils'
import { isPTDDoc } from './utils/phrase'

export default async function getPTDsFromPhraseWebhook({
  sanityClient,
  jobsInWebhook,
}: {
  sanityClient: SanityClient
  jobsInWebhook: Phrase['JobInWebhook'][]
}) {
  const jobs = jobsInWebhook.filter(jobComesFromSanity)

  if (jobs.length === 0) {
    return {
      body: { message: 'No jobs from Sanity to parse' },
      status: 200,
    } as const
  }

  const projectUids = dedupeArray(
    jobs.flatMap((jobPart) => jobPart.project?.uid || []),
  )

  const PTDs = await sanityClient
    .fetch<SanityDocumentWithPhraseMetadata[]>(
      /* groq */ `*[
      ${METADATA_KEY}.projectUid in $projectUids &&
      count(${METADATA_KEY}.jobs[uid in $jobUids]) > 0
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

  return PTDs.filter(isPTDDoc)
}
