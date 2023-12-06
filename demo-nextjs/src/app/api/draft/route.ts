import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidSecret } from 'sanity-plugin-iframe-pane/is-valid-secret'

import { previewSecretId, writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'
import { pathToAbsUrl } from '~/lib/urls'

export async function GET(request: Request) {
  if (!writeToken) {
    return new Response('Misconfigured server', { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const pathToRedirect = searchParams.get('pathToRedirect')
    ? decodeURIComponent(searchParams.get('pathToRedirect'))
    : undefined
  const id = searchParams.get('publishedId')

  console.log({ pathToRedirect, id })

  if (!pathToRedirect || !id) {
    return new Response(
      '`pathToRedirect` and `id` query parameters are required',
      {
        status: 400,
      },
    )
  }

  const secret = searchParams.get('secret')
  // Check the secret and next parameters
  // This secret should only be known to this route handler and the CMS
  if (!secret) {
    return new Response('Invalid token', { status: 401 })
  }

  draftMode().enable()
  return redirect(pathToAbsUrl(`/${pathToRedirect}?id=${id}`))
}
