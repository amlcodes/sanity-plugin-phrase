import { SanityClient } from 'sanity'
import {
  METADATA_KEY,
  Phrase,
  SanityPTDWithExpandedMetadata,
  SanityTMD,
} from '../types'
import { dedupeArray, comesFromSanity } from '../utils'
import { isPTDDoc } from '../utils/phrase'

export default async function getPTDsFromPhraseWebhook({
  sanityClient,
  jobsInWebhook,
}: {
  sanityClient: SanityClient
  jobsInWebhook: Phrase['JobInWebhook'][]
}) {
  const jobs = jobsInWebhook.filter(comesFromSanity)

  if (jobs.length === 0) {
    return {
      body: { message: 'No jobs from Sanity to parse' },
      status: 200,
    } as const
  }

  const projectUids = dedupeArray(
    jobs.flatMap((jobPart) => jobPart.project?.uid || []),
  )

  const TMDs = await sanityClient
    .fetch<SanityTMD[]>(
      /* groq */ `*[
      phraseProjectUid in $projectUids
    ]`,
      {
        projectUids,
      },
    )
    .catch(() => false as const)

  if (TMDs === false) {
    return {
      body: { message: "Couldn't fetch TMDs from Sanity" },
      status: 500,
    } as const
  }

  const jobUids = dedupeArray(jobs.flatMap((job) => job.uid || []))
  const PTDsToFetch = TMDs.flatMap((TMD) =>
    TMD.targets.flatMap((t) =>
      t.jobs.some((j) => j.uid && jobUids.includes(j.uid)) ? t.ptd._ref : [],
    ),
  )

  const PTDs = await sanityClient
    .fetch<SanityPTDWithExpandedMetadata[]>(
      /* groq */ `*[_id in $ids] {
      ...,
      ${METADATA_KEY} {
        ...,
        "expanded": tmd->,
      },
    }`,
      {
        ids: PTDsToFetch,
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
