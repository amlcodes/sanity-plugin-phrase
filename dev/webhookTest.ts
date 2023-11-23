import testWebhook from '../example-data/webhooks/test-payload.json'
import handlePhraseWebhook from '../src/handleWebhook/handlePhraseWebhook'
import { testCredentials } from './testCredentials'
import { testSanityClient } from './testSanityClient'
import { translatableTypes } from './testSchema'

const response = await handlePhraseWebhook({
  credentials: testCredentials,
  sanityClient: testSanityClient,
  payload: testWebhook as any,
  translatableTypes,
})

console.log({ final: response })
