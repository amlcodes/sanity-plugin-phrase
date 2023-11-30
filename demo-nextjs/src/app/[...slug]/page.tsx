import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { LiveQuery } from 'next-sanity/preview/live-query'

import { sanityFetch } from '~/lib/sanity.fetch'
import { getPostQuery, Post } from '~/lib/sanity.queries'
import { isSupportedLanguage } from '~/utils'

import PostPage from './PostPage'
import PreviewPostPage from './PreviewPostPage'

export { generateStaticParams } from '~/lib/generateStaticParams'

export default async function PostRoute({
  params,
  searchParams,
}: {
  params: { slug: string[] }
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const lang = isSupportedLanguage(params.slug[0]) ? params.slug[0] : 'en'
  const slug = (
    isSupportedLanguage(params.slug[0]) ? params.slug.slice(1) : params.slug
  ).join('/')
  const postId = searchParams?.id

  const { query, params: queryParams } = getPostQuery(
    typeof postId === 'string' ? { id: postId, lang } : { slug, lang },
  )

  const post = await sanityFetch<Post | null>({
    query,
    params: queryParams,
    tags: ['post'],
  })

  console.log({
    postId,
    slug,
    lang,
    query,
    queryParams,
    enabled: draftMode().isEnabled,
  })

  if (!post) {
    return notFound()
  }

  return (
    <LiveQuery
      enabled={draftMode().isEnabled}
      query={query}
      params={queryParams}
      initialData={post}
      as={PreviewPostPage}
    >
      <PostPage data={post} />
    </LiveQuery>
  )
}
