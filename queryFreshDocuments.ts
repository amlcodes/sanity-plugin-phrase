import { i18nAdapter } from './i18nAdapter'
import { sanityClient } from './sanityClient'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'

export default async function queryFreshDocuments(props: TranslationRequest) {
  const freshDocuments = await i18nAdapter.getFreshDocuments({
    ...props,
    sanityClient,
  })

  const freshDocumentsByLang = freshDocuments.reduce(
    (acc, t) => ({
      ...acc,
      [t.lang]: t,
    }),
    {} as Record<string, SanityTranslationDocPair>,
  )

  const freshDocumentsById = freshDocuments.reduce((acc, t) => {
    if (t.draft) acc[t.draft._id] = t.draft
    if (t.published) acc[t.published._id] = t.published

    return acc
  }, {} as Record<string, SanityDocumentWithPhraseMetadata>)

  return { freshDocumentsByLang, freshDocumentsById, freshDocuments }
}
