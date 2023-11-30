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
        _id: 'drafts.d5d369b5-22e0-413f-ac34-03f3fe9f09e3',
        _rev: '495c30ec-de75-4e90-b2a8-a275418a152c',
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
