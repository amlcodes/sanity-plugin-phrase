import { SanityClient } from 'sanity'
import getPTDsFromPhraseWebhook from './getPTDsFromPhraseWebhook'
import { JobDeletedWebhook } from './handlePhraseWebhook'

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

  return '@TODO'

  // @TODO: finish dealing with job deletion
  // Probably mark job as deleted, perhaps mark source/target docs as translation deleted if no more job is active?
}
