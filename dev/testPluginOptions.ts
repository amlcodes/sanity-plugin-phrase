import { documentInternationalizationAdapter } from '../src/adapters/document-internationalization'
import definePhraseOptions from '../src/definePhraseOptions'

export const testPluginOptions = definePhraseOptions({
  translatableTypes: ['post'],
  supportedTargetLangs: ['pt', 'es'],
  sourceLang: 'en',
  apiEndpoint: '/api/phrase',
  phraseRegion: 'us',
  phraseTemplates: [
    {
      templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
      label: '[Sanity.io] Default template',
    },
  ],
  i18nAdapter: documentInternationalizationAdapter(),
})
