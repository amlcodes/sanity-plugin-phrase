import { i18nAdapter } from './adapters'
import { sanityClient } from './sanityClient'
import { SanityDocumentWithPhraseMetadata, TranslationRequest } from './types'

export default async function queryFreshDocuments(props: TranslationRequest) {
  const freshDocuments = await i18nAdapter.getOrCreateTranslatedDocuments({
    ...props,
    sanityClient,
  })

  const freshDocumentsById = freshDocuments.reduce((acc, t) => {
    if (t.draft) acc[t.draft._id] = t.draft
    if (t.published) acc[t.published._id] = t.published

    return acc
  }, {} as Record<string, SanityDocumentWithPhraseMetadata>)

  return { freshDocumentsById, freshDocuments }
}
