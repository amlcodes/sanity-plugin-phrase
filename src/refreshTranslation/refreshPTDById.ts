import { SanityClient } from 'sanity'
import refreshPTDs from '../refreshTranslation/refreshPTDs'
import {
  PhraseCredentialsInput,
  SanityDocumentWithPhraseMetadata,
} from '~/types'
import { draftId, undraftId } from '~/utils'

export default async function refreshPTDById(inputRequest: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  ptdId: string
}) {
  const PTDs = await inputRequest.sanityClient.fetch<
    SanityDocumentWithPhraseMetadata[]
  >(`*[_id == $publishedId || _id == $draftId]`, {
    publishedId: undraftId(inputRequest.ptdId),
    draftId: draftId(inputRequest.ptdId),
  })

  return refreshPTDs({ ...inputRequest, docs: PTDs })
}
