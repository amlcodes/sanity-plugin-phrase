import { writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'
import { backendRequestHandler } from '~/plugin-dist'
import { schemaTypes } from '~/schemas'

export const POST = backendRequestHandler({
  phraseCredentials: {},
  sanityClient: client.withConfig({ token: writeToken }),
  schemaTypes: schemaTypes,
  translatableTypes: ['post']
})
