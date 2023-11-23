import { SanityClient } from 'sanity'
import { PhraseCredentialsInput, SanityPTDWithExpandedMetadata } from '~/types'
import { draftId, isPTDDoc, undraftId } from '~/utils'
import refreshPTDs from '../refreshTranslation/refreshPTDs'

export default async function refreshPTDById(input: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  ptdId: string
  translatableTypes: string[]
}) {
  const PTDs = await input.sanityClient.fetch<SanityPTDWithExpandedMetadata[]>(
    `*[_id == $publishedId || _id == $draftId]{
    ...,
    phraseMetadata->{
      ...,
      "expanded": tmd->
    }
  }`,
    {
      publishedId: undraftId(input.ptdId),
      draftId: draftId(input.ptdId),
    },
  )

  return refreshPTDs({ ...input, PTDs: PTDs.filter(isPTDDoc) })
}
