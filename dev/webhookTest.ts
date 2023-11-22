import testWebhook from '../example-data/webhooks/test-payload.json'
import handlePhraseWebhook from '../src/handlePhraseWebhook'
import { testCredentials } from './testCredentials'
import { testSanityClient } from './testSanityClient'

const response = await handlePhraseWebhook({
  credentials: testCredentials,
  sanityClient: testSanityClient,
  payload: testWebhook as any,
})

console.log({ final: response })
