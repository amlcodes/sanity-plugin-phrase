import createMultipleTranslations from '../src/createTranslation/createMultipleTranslations'
import { testCredentials } from './testCredentials'
import { testPluginOptions } from './testPluginOptions'
import { testSanityClient } from './testSanityClient'

const response = await createMultipleTranslations({
  credentials: testCredentials,
  sanityClient: testSanityClient,
  translations: [
    {
      templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
      sourceDoc: {
        _id: 'drafts.31c34d6f-d295-4bf1-8f77-7a51a459a1b1',
        _rev: 'zHeFW2t7bUb3lAyGGnWe8T',
        _type: 'post',
        lang: 'en',
      },
      targetLangs: ['pt', 'es'],
      translationName: '[Sanity.io] Demonstration November 29th',
    },
  ],
  pluginOptions: testPluginOptions,
})
console.log({ final: response })
