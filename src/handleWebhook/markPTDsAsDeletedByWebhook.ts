import { SanityClient } from 'sanity'
import getPTDsFromPhraseWebhook from '../handleWebhook/getPTDsFromPhraseWebhook'
import { JobDeletedWebhook } from '../handleWebhook/handlePhraseWebhook'
import { PhraseJobInfo } from '../types'

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
    const metaDoc = PTD.phraseMetadata.expanded
    const lang = PTD.phraseMetadata.targetLang
    const targetInMeta = metaDoc.targets.find(
      (t) => t.lang.sanity === lang.sanity,
    )
    if (!targetInMeta?.jobs) return

    const cancelledJobsInPTD = cancelledJobUids.filter((uid) =>
      targetInMeta.jobs.find((j) => j.uid === uid),
    )
    transaction.patch(metaDoc._id, (patch) => {
      cancelledJobsInPTD.forEach((uid) => {
        const updatedData: Pick<PhraseJobInfo, 'status'> = {
          [`targets[_key == "${lang.sanity}"].jobs[uid=="${uid}"].status` as 'status']:
            'CANCELLED',
        }
        patch.set(updatedData)
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
