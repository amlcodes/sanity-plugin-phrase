import { SanityClient } from '@sanity/client'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { undraftId } from './utils'

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
      SanityTranslationDocPair[]
    >(
      /* groq */ `
  *[_type == "translation.metadata" && references($undraftedId)][0]
    .translations[]{
      "lang": _key,
      "published": value->,
      "draft": *[_id == ("drafts." + ^.value._ref)][0],
    }
  `,
      {
        undraftedId: undraftId(props.sourceDoc._id),
      },
    )

    return freshDocuments
  },
}
