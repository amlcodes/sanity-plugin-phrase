import { writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'
import { nextjsRouteHandler } from '~/plugin-dist'

export const POST = nextjsRouteHandler(client.withConfig({ token: writeToken }))
