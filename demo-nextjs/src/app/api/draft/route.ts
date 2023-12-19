import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { writeToken } from '~/lib/sanity.api'
import { pathToAbsUrl } from '~/lib/urls'

export async function GET(request: Request) {
  if (!writeToken) {
    return new Response('Misconfigured server', { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const rawPathToRedirect = searchParams.get('pathToRedirect')
  const pathToRedirect = rawPathToRedirect
    ? decodeURIComponent(rawPathToRedirect)
    : undefined
  const id = searchParams.get('publishedId')

  if (!pathToRedirect || !id) {
    return new Response(
      '`pathToRedirect` and `id` query parameters are required',
      {
        status: 400,
      },
    )
  }

  draftMode().enable()
  return redirect(pathToAbsUrl(`/${pathToRedirect}?id=${id}`))
}
