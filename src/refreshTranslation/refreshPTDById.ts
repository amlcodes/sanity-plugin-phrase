import { SanityClient } from 'sanity'
import refreshPTDs from '../refreshTranslation/refreshPTDs'
import {
  PhraseCredentialsInput,
  SanityDocumentWithPhraseMetadata,
} from '~/types'
import { isPTDDoc, draftId, undraftId } from '~/utils'

export default async function refreshPTDById(input: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  ptdId: string
}) {
  const PTDs = await input.sanityClient.fetch<
    SanityDocumentWithPhraseMetadata[]
  >(`*[_id == $publishedId || _id == $draftId]`, {
    publishedId: undraftId(input.ptdId),
    draftId: draftId(input.ptdId),
  })

  return refreshPTDs({ ...input, PTDs: PTDs.filter(isPTDDoc) })
}
