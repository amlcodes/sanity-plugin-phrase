import { SanityClient } from 'sanity'
import refreshPTDs from './refreshPTDs'
import {
  PhraseCredentialsInput,
  PhrasePluginOptions,
  SanityPTDWithExpandedMetadata,
} from '../types'
import { draftId, isPTDDoc, undraftId } from '../utils'
import { PTDWithExpandedDataQuery } from './refreshPTDs'

export default async function refreshPTDById(input: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  ptdId: string
  pluginOptions: PhrasePluginOptions
}) {
  const PTDs = await input.sanityClient.fetch<SanityPTDWithExpandedMetadata[]>(
    `*[_id == $publishedId || _id == $draftId]{
    ...,
    phraseMetadata {
      ${PTDWithExpandedDataQuery}
    }
  }`,
    {
      publishedId: undraftId(input.ptdId),
      draftId: draftId(input.ptdId),
    },
  )

  return refreshPTDs({ ...input, PTDs: PTDs.filter(isPTDDoc) })
}
