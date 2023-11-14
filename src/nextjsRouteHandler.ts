'use client'
import { SanityClient } from 'sanity'
import handlePhraseWebhook, { PhraseWebhook } from './handlePhraseWebhook'
import createAuthedPhraseClient from './createAuthedPhraseClient'
import refreshPtdById from './refreshPtdById'
import { EndpointActionTypes } from './types'
import createTranslations from './createTranslations'

export default function nextjsRouteHandler(clientWithWriteToken: SanityClient) {
  if (!clientWithWriteToken.config().token) {
    throw new Error("[Phrase's nextRouteHandler] Missing token")
  }

  return async function phraseRouteHandler(request: Request) {
    const body = await request.json().catch(() => {})

    if (typeof body !== 'object' || !body) {
      return new Response({ error: 'Invalid request' }, { status: 400 })
    }

    if ('event' in body && 'jobParts' in body) {
      const updated = await handlePhraseWebhook(
        clientWithWriteToken,
        body as PhraseWebhook,
      )

      return updated ? new Response('OK') : new Response('Failed updating')
    }

    // @TODO auth via token in Sanity?
    if (
      !('action' in body) ||
      Object.values(EndpointActionTypes).includes(body.action as any)
    ) {
      return new Response({ error: 'Invalid request' }, { status: 400 })
    }

    if (body.action === EndpointActionTypes.REFRESH_PTD) {
      const ptdId = 'ptdId' in body && body.ptdId

      if (typeof ptdId !== 'string') {
        return new Response({ error: 'Invalid request' }, { status: 400 })
      }

      const phraseClient = await createAuthedPhraseClient(clientWithWriteToken)
      await refreshPtdById(clientWithWriteToken, phraseClient, ptdId)
      new Response({ success: true }, { status: 200 })
    }

    if (body.action === EndpointActionTypes.CREATE_TRANSLATIONS) {
      if (
        !('translations' in body) ||
        !Array.isArray(body.translations) ||
        body.translations.length === 0
      ) {
        return new Response({ error: 'Invalid request' }, { status: 400 })
      }

      console.log(
        'Translating...',
        body.translations.map((t) => t.sourceDoc),
      )
      try {
        const phraseClient = await createAuthedPhraseClient(
          clientWithWriteToken,
        )

        // @TODO handle errors
        await Promise.all(
          body.translations.map((t) =>
            createTranslations({
              phraseClient,
              sanityClient: clientWithWriteToken,
              ...t,
            }),
          ),
        )
        new Response({ success: true }, { status: 200 })
      } catch (error) {
        return new Response({ error: 'Something went wrong' }, { status: 500 })
      }
    }

    return new Response({ error: 'Invalid request' }, { status: 400 })
  }
}
