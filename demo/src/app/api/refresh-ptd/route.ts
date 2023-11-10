import { writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'
import { createAuthedPhraseClient, refreshPtdById } from '~/plugin-dist'

export async function POST(request: Request) {
  const body = await request.json()

  const ptdId = body?.id

  if (!ptdId) {
    return new Response('Invalid request', {
      status: 400,
    })
  }

  const sanityClient = client.withConfig({
    perspective: 'raw',
    token: writeToken,
  })
  const phraseClient = await createAuthedPhraseClient(sanityClient)

  await refreshPtdById(sanityClient, phraseClient, ptdId)

  return new Response('OK')
}
