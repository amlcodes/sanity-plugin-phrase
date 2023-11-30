import { SanityClient } from 'sanity'
import { createResponse } from './backendHelpers'
import createMultipleTranslations from './createTranslation/createMultipleTranslations'
import handlePhraseWebhook, {
  PhraseWebhook,
} from './handleWebhook/handlePhraseWebhook'
import refreshPTDById from './refreshTranslation/refreshPTDById'
import {
  EndpointActionTypes,
  PhraseCredentialsInput,
  PhrasePluginOptions,
} from './types'

type BackendInput = {
  /** Sanity client with write token (can modify data) */
  sanityClient: SanityClient
  /** Necessary to issue access tokens from Phrase */
  phraseCredentials: PhraseCredentialsInput
  pluginOptions: PhrasePluginOptions
}

export function createInternalHandler(rawInput: BackendInput) {
  const input = parseInput(rawInput)

  const { sanityClient, phraseCredentials: credentials, pluginOptions } = input

  return async function internalHandler(body: Object) {
    if (typeof body !== 'object' || !body) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
      })
    }

    if ('event' in body && ('jobParts' in body || 'project' in body)) {
      const updated = await handlePhraseWebhook({
        credentials,
        sanityClient,
        payload: body as PhraseWebhook,
        pluginOptions,
      })

      return updated ? new Response('OK') : new Response('Failed updating')
    }

    if (
      !('action' in body) ||
      !Object.values(EndpointActionTypes).includes(body.action as any)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
      })
    }

    if (body.action === EndpointActionTypes.REFRESH_PTD) {
      const ptdId = 'ptdId' in body && body.ptdId

      if (typeof ptdId !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
        })
      }

      const res = await refreshPTDById({
        sanityClient: sanityClient,
        credentials: credentials,
        ptdId,
        pluginOptions,
      })
      return createResponse(res.body, res.status)
    }

    if (body.action === EndpointActionTypes.CREATE_TRANSLATIONS) {
      if (
        !('translations' in body) ||
        !Array.isArray(body.translations) ||
        body.translations.length === 0
      ) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
        })
      }

      const res = await createMultipleTranslations({
        translations: body.translations,
        credentials: credentials,
        sanityClient: sanityClient,
        pluginOptions,
      })
      return createResponse(res.body, res.status)
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
    })
  }
}

/**
 * Request / Response handler for the backend endpoints
 */
export function createRequestHandler(input: BackendInput) {
  const handler = createInternalHandler(input)

  return async function phraseRouteHandler(request: Request) {
    const body = await request.json().catch(() => {})

    return handler(body)
  }
}

function parseInput(input: BackendInput): BackendInput {
  const { sanityClient, phraseCredentials: credentials } = input
  if (!sanityClient.config().token) {
    throw new Error(
      '[sanity-plugin-phrase/backend] Missing write Sanity client',
    )
  }

  if (!sanityClient.config().token) {
    throw new Error(
      '[sanity-plugin-phrase/backend] Missing write token in Sanity client',
    )
  }

  if (!credentials) {
    throw new Error(
      '[sanity-plugin-phrase/backend] Missing `phraseCredentials`',
    )
  }

  if (!credentials.userName || typeof credentials.userName !== 'string') {
    throw new Error(
      '[sanity-plugin-phrase/backend] Missing `phraseCredentials.userName`',
    )
  }

  if (!credentials.password || typeof credentials.password !== 'string') {
    throw new Error(
      '[sanity-plugin-phrase/backend] Missing `phraseCredentials.password`',
    )
  }

  if (
    !credentials.region ||
    typeof credentials.region !== 'string' ||
    !['eur', 'us'].includes(credentials.region)
  ) {
    throw new Error(
      '[sanity-plugin-phrase/backend] Missing or invalid `phraseCredentials.region`',
    )
  }

  return {
    ...input,
    sanityClient: sanityClient.withConfig({
      perspective: 'raw',
      useCdn: false,
    }),
  }
}
