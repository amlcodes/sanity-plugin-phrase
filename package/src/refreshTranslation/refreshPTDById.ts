import { SanityClient } from 'sanity'
import refreshPTDs from './refreshPTDs'
import {
  PhraseCredentialsInput,
  PhrasePluginOptions,
  SanityPTDWithExpandedMetadata,
} from '../types'
import { draftId, isPTDDoc, isPtdId, undraftId } from '../utils'
import { PTDWithExpandedDataQuery } from './refreshPTDs'

export type RefreshPTDByIdResponse = Awaited<ReturnType<typeof refreshPTDById>>

export default async function refreshPTDById(input: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  ptdId: string
  pluginOptions: PhrasePluginOptions
}) {
  if (!isPtdId(input.ptdId)) {
    return {
      status: 400,
      body: {
        error: 'InvalidPTDId',
      },
    } as const
  }

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
