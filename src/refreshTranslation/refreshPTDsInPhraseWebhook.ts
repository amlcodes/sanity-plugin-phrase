import { SanityClient } from 'sanity'
import getPTDsFromPhraseWebhook from '~/getPTDsFromPhraseWebhook'
import { Phrase, PhraseCredentialsInput } from '~/types'
import refreshPTDs from './refreshPTDs'

export default async function refreshPTDsInPhraseWebhook(inputRequest: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  jobsInWebhook: Phrase['JobInWebhook'][]
}) {
  const PTDs = await getPTDsFromPhraseWebhook(inputRequest)

  if (!Array.isArray(PTDs)) {
    return PTDs
  }

  return refreshPTDs({ ...inputRequest, docs: PTDs })
}
