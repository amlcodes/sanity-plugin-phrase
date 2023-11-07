import { SanityClient } from '@sanity/client'
import {
  SanityDocumentWithPhraseMetadata,
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
  getFreshDocuments: (
    props: TranslationRequest & { sanityClient: SanityClient },
  ) => Promise<SanityTranslationDocPair[]>
  injectDocumentLang: (
    document: SanityDocumentWithPhraseMetadata,
    /** Language identifier as set in Phrase
     * @example `en`, `cz`, `en_ax`, `pt_br`, `es_419`, etc.
     */
    lang: string,
  ) => SanityDocumentWithPhraseMetadata
}

export const i18nAdapter: I18nAdapter = {
  injectDocumentLang: (document, lang) => ({ ...document, language: lang }),
  getFreshDocuments: async (props) => {
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
}
