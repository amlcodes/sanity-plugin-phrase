import handlePhraseWebhook from './src/handlePhraseWebhook'
import { testSanityClient } from './src/testSanityClient'
import testWebhook from './example-data/webhooks/test-payload.json'

handlePhraseWebhook(testSanityClient, testWebhook as any)
