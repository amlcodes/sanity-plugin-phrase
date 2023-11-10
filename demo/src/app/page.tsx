import { draftMode } from 'next/headers'
import { LiveQuery } from 'next-sanity/preview/live-query'

import { sanityFetch } from '~/lib/sanity.fetch'
import { Post, postsQuery } from '~/lib/sanity.queries'

import PostsIndex from './PostsIndex'
import PostsIndexPreview from './PostsIndexPreview'

export default async function IndexPage() {
  const query = postsQuery
  const posts = await sanityFetch<Post[]>({ query, tags: ['post'] })

  return (
    <LiveQuery
      enabled={draftMode().isEnabled}
      query={query}
      initialData={posts}
      as={PostsIndexPreview}
    >
      <PostsIndex data={posts} />
    </LiveQuery>
  )
}
