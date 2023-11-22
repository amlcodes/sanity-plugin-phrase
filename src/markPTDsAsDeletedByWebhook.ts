import { SanityClient } from 'sanity'
import getPTDsFromPhraseWebhook from './getPTDsFromPhraseWebhook'
import { JobDeletedWebhook } from './handlePhraseWebhook'
import { METADATA_KEY } from './types'

export default async function markPTDsAsDeletedByWebhook({
  sanityClient,
  payload,
}: {
  sanityClient: SanityClient
  payload: JobDeletedWebhook
}) {
  const PTDs = await getPTDsFromPhraseWebhook({
    sanityClient,
    jobsInWebhook: payload.jobParts,
  })

  if (!Array.isArray(PTDs)) {
    return PTDs
  }

  const transaction = sanityClient.transaction()
  const cancelledJobUids = payload.jobParts.flatMap((job) => job.uid || [])

  PTDs.forEach((PTD) => {
    const cancelledJobsInPTD = cancelledJobUids.filter((uid) =>
      PTD.phraseMetadata.jobs.find((j) => j.uid === uid),
    )
    transaction.patch(PTD._id, (patch) => {
      cancelledJobsInPTD.forEach((uid) => {
        patch.set({
          [`${METADATA_KEY}.jobs[uid=="${uid}"].status`]: 'CANCELLED',
        })
      })
      return patch
    })
  })

  try {
    await transaction.commit()
    return {
      body: { message: 'Successfully marked PTDs as deleted' },
      status: 200,
    }
  } catch (error) {
    return {
      body: { error: 'Failed to mark PTDs as deleted' },
      status: 500,
    }
  }
}
