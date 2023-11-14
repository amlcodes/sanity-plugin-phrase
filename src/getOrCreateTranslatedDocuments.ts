import { i18nAdapter } from './adapters'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { langAdapter } from './utils'

export default async function getOrCreateTranslatedDocuments(
  props: TranslationRequest,
) {
  const freshDocumentsSource =
    await i18nAdapter.getOrCreateTranslatedDocuments(props)
  const freshDocuments = freshDocumentsSource.map(
    (d) =>
      ({
        ...d,
        lang: langAdapter.sanityToCrossSystem(d.lang),
      }) as SanityTranslationDocPair,
  )

  const freshDocumentsById = freshDocuments.reduce(
    (acc, t) => {
      if (t.draft) acc[t.draft._id] = t.draft
      if (t.published) acc[t.published._id] = t.published

      return acc
    },
    {} as Record<string, SanityDocumentWithPhraseMetadata>,
  )

  return { freshDocumentsById, freshDocuments }
}
