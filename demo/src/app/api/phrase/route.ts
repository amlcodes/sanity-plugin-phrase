import { PHRASE_CONFIG } from 'phraseConfig'
import { writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'
import { backendRequestHandler } from '~/plugin-dist/backend.esm'

export const POST = backendRequestHandler({
  phraseCredentials: {
    userName: process.env.PHRASE_USER_NAME || '',
    password: process.env.PHRASE_PASSWORD || '',
    region: (process.env.PHRASE_REGION as any) || 'eu',
  },
  sanityClient: client.withConfig({ token: writeToken }),
  pluginOptions: PHRASE_CONFIG,
})
