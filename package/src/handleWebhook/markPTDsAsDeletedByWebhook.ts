import { SanityClient } from 'sanity'
import getPTDsFromPhraseWebhook from './getPTDsFromPhraseWebhook'
import { JobDeletedWebhook } from './handlePhraseWebhook'
import { PhraseJobInfo } from '../types'
import { langsAreTheSame, targetPathInTMD } from '../utils'

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
    const metaDoc = PTD.phraseMetadata.expandedTMD

    if (!metaDoc) return

    const lang = PTD.phraseMetadata.targetLang
    const targetInMeta = metaDoc.targets.find((t) =>
      langsAreTheSame(t.lang, lang),
    )

    if (!targetInMeta?.jobs || !Array.isArray(targetInMeta.jobs)) return

    const cancelledJobsInPTD = cancelledJobUids.filter((uid) =>
      (targetInMeta.jobs as PhraseJobInfo[]).find((j) => j.uid === uid),
    )
    transaction.patch(metaDoc._id, (patch) => {
      cancelledJobsInPTD.forEach((uid) => {
        const updatedData: Pick<PhraseJobInfo, 'status'> = {
          [`${targetPathInTMD(
            lang.sanity,
          )}.jobs[uid=="${uid}"].status` as 'status']: 'CANCELLED',
        }
        patch.set(updatedData)
      })
      return patch
    })
  })

  try {
    await transaction.commit({ returnDocuments: false })
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
