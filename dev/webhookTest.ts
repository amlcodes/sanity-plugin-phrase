import testWebhook from '../example-data/webhooks/test-payload.json'
import handlePhraseWebhook from '../src/handleWebhook/handlePhraseWebhook'
import { testCredentials } from './testCredentials'
import { testPluginOptions } from './testPluginOptions'
import { testSanityClient } from './testSanityClient'

const response = await handlePhraseWebhook({
  credentials: testCredentials,
  sanityClient: testSanityClient,
  payload: testWebhook as any,
  pluginOptions: testPluginOptions,
})

console.log({ final: response })
