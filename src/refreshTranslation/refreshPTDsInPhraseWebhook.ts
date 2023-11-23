import { SanityClient } from 'sanity'
import getPTDsFromPhraseWebhook from '../handleWebhook/getPTDsFromPhraseWebhook'
import { Phrase, PhraseCredentialsInput } from '../types'
import refreshPTDs from './refreshPTDs'

export default async function refreshPTDsInPhraseWebhook(input: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  jobsInWebhook: Phrase['JobInWebhook'][]
  translatableTypes: string[]
}) {
  const PTDs = await getPTDsFromPhraseWebhook(input)

  if (!Array.isArray(PTDs)) {
    return PTDs
  }

  return refreshPTDs({ ...input, PTDs: PTDs })
}
