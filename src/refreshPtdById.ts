import { PhraseClient } from './createPhraseClient'
import refreshPtdsFromPhraseData from './refreshPtdsFromPhraseData'
import { sanityClient } from './sanityClient'
import { SanityDocumentWithPhraseMetadata } from './types'

export default async function refreshPtdById(
  phraseClient: PhraseClient,
  id: string,
) {
  const ptdMetadata = await sanityClient.fetch<
    SanityDocumentWithPhraseMetadata['phraseMeta'] | null
  >(`*[_id == $id][0].phraseMeta`, { id: id })

  if (ptdMetadata?._type !== 'phrase.ptd.meta') {
    throw new Error(
      "Document doesn't exist or isn't a Phrase Translation Document (PTD)",
    )
  }

  // @TODO: refreshPtdsFromPhraseData is currently a long roundabout that exists because of the webhook payload
  // Can we make it simpler and faster?
  await refreshPtdsFromPhraseData({
    phraseClient,
    ptdMetadata,
  })
}
