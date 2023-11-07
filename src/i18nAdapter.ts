import { SanityClient } from '@sanity/client'
import {
  PhraseLangCode,
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { draftId, undraftId } from './utils'

/**
 * @TODO:
 * - getTranslatedReferences
 * - getOrCreateTranslatedDocuments
 */
type I18nAdapter = {
  /**
   * Given the current translation request, fetches the fresh versions of the
   * requested document and target languages.
   *
   * It should return documents for ALL requested languages, so this function should
   * create them if they don't exist.
   */
  getOrCreateTranslatedDocuments: (
    props: TranslationRequest & { sanityClient: SanityClient },
  ) => Promise<SanityTranslationDocPair[]>

  langAdapter: {
    toSanity: (phraseLang: PhraseLangCode) => SanityLangCode
    toPhrase: (sanityLang: SanityLangCode) => PhraseLangCode
  }

  injectDocumentLang: (
    document: SanityDocumentWithPhraseMetadata,
    lang: SanityLangCode,
  ) => SanityDocumentWithPhraseMetadata
  getDocumentLang: (
    document: SanityDocumentWithPhraseMetadata,
  ) => SanityLangCode | null
}

export const i18nAdapter: I18nAdapter = {
  injectDocumentLang: (document, language) => ({ ...document, language }),
  getDocumentLang: (document) => (document?.language as string) || null,
  getOrCreateTranslatedDocuments: async (props) => {
    const freshDocuments = await props.sanityClient.fetch<
      SanityTranslationDocPair[] | SanityTranslationDocPair
    >(
      /* groq */ `
  coalesce(
    // For documents with translations, fetch the translations metadata
    *[_type == "translation.metadata" && references($publishedId)][0].translations[] {
      "lang": _key,
      "published": value->,
      "draft": *[_id == ("drafts." + ^.value._ref)][0],
    },
    // Otherwise, fetch the document itself and handle its draft & published states
    *[_id == $publishedId][0]{
      "lang": language,
      "published": @,
      "draft": *[_id == $draftId][0],
    },
    *[_id == $draftId][0]{
      "lang": language,
      "published": null,
      "draft": @,
    },
  )
  `,
      {
        publishedId: undraftId(props.sourceDoc._id),
        draftId: draftId(props.sourceDoc._id),
      },
    )

    if (!freshDocuments) throw new Error('Failed fetching fresh documents')

    return Array.isArray(freshDocuments) ? freshDocuments : [freshDocuments]
  },
  langAdapter: {
    toPhrase: (sanityLang) => sanityLang.replace(/_/g, '-'),
    toSanity: (phraseLang) => phraseLang.replace(/-/g, '_'),
  },
}
