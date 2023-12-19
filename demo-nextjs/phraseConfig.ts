import { documentInternationalizationAdapter } from 'sanity-plugin-phrase/adapters'
import { definePhraseOptions } from 'sanity-plugin-phrase/config'
import {
  LANGUAGES,
  SOURCE_LANGUAGE,
  TRANSLATABLE_SCHEMAS,
  undraftId,
} from '~/utils'

export const PHRASE_CONFIG = definePhraseOptions({
  i18nAdapter: documentInternationalizationAdapter(),
  translatableTypes: TRANSLATABLE_SCHEMAS,
  supportedTargetLangs: LANGUAGES.flatMap((lang) =>
    lang.id && lang.id !== SOURCE_LANGUAGE ? [lang.id] : [],
  ),
  sourceLang: SOURCE_LANGUAGE,
  apiEndpoint: process.env.NEXT_PUBLIC_PHRASE_PLUGIN_API_ENDPOINT,
  phraseRegion: process.env.NEXT_PUBLIC_PHRASE_REGION || 'eu',
  phraseTemplates: [
    {
      templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
      label: '[Sanity.io] Default template',
    },
  ],
  getDocumentPreview: async (doc, sanityClient) => {
    const previewSecretId = 'preview.secret'
    const previewSecret = await sanityClient.fetch(
      `*[_id == "${previewSecretId}"][0].secret`,
    )
    return `${
      process.env.NEXT_PUBLIC_BASE_URL
    }/api/draft?pathToRedirect=${encodeURIComponent(
      `${doc.language === 'en' ? '' : `/${doc.language}`}/${(doc.slug as any)
        ?.current}`,
    )}&publishedId=${undraftId(doc._id)}&secret=${previewSecret}`
  },
})
