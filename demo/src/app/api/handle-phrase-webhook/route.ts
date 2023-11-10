import { writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'
import handlePhraseWebhook from '~/plugin-dist/handlePhraseWebhook'

export async function POST(request: Request) {
  const body = await request.json()

  const updated = await handlePhraseWebhook(
    client.withConfig({
      perspective: 'raw',
      token: writeToken,
    }),
    body,
  )

  return updated ? new Response('OK') : new Response('Failed updating')
}
