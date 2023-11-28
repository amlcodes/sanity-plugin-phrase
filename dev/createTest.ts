import createMultipleTranslations from '../src/createTranslation/createMultipleTranslations'
import { testSanityClient } from './testSanityClient'
import testSchema from './testSchema'
import { testCredentials } from './testCredentials'
import { testPluginOptions } from './testPluginOptions'

const response = await createMultipleTranslations({
  schemaTypes: testSchema,
  credentials: testCredentials,
  sanityClient: testSanityClient,
  translations: [
    {
      templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
      sourceDoc: {
        _id: 'drafts.597c3426-c389-42f0-ad62-c8224256a6b3',
        _rev: '8ec3dd5e-ff7b-4439-bb7e-247572fa13b6',
        _type: 'post',
        lang: 'en',
      },
      targetLangs: ['pt'],
    },
  ],
  pluginOptions: testPluginOptions,
})
console.log({ final: response })
