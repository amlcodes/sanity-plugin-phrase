import createMultipleTranslations from '../src/createTranslation/createMultipleTranslations'
import { testSanityClient } from './testSanityClient'
import testSchema from './testSchema'
import { testCredentials } from './testCredentials'

const response = await createMultipleTranslations({
  schemaTypes: testSchema,
  credentials: testCredentials,
  sanityClient: testSanityClient,
  translations: [
    // {
    //   templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
    //   sourceDoc: {
    //     _id: 'a2bafcca-fc41-4f4b-85c4-adb3307993d2',
    //     _rev: 'bvdFY8iWN5ZXtp8P4lz0up',
    //     _type: 'post',
    //     lang: 'en',
    //   },
    //   targetLangs: ['pt'],
    // },
    {
      templateUid: process.env.PHRASE_TEMPLATE_UID,
      sourceDoc: {
        _id: 'drafts.29b6c10d-6c89-4f88-9132-aae1095ad65c',
        _rev: 'yblsDKVOfabu1vzRxiLhB6',
        _type: 'post',
        lang: 'en',
      },
      targetLangs: ['pt'],
    },
  ],
})
console.log({ final: response })
