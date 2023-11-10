import type { PortableTextBlock } from '@portabletext/types'
import type { ImageAsset, Slug } from '@sanity/types'
import { type SanityClient } from 'next-sanity'

import { SupportedLanguage } from '~/utils'

const NOT_PTD = `phraseMeta._type != "phrase.ptd.meta"`

export const postsQuery = /* groq */ `*[
  _type == "post" &&
  defined(slug.current) &&
  ${NOT_PTD}
] {
  _id,
  _createdAt,
  language,
  title,
  slug,
  excerpt,
  mainImage,
} | order(_createdAt desc)`

export async function getPosts(client: SanityClient): Promise<Post[]> {
  return await client.fetch(postsQuery)
}

export const postBySlugQuery = /* groq */ `*[_type == "post" && slug.current == $slug && language == $lang][0]`
export const postByIdQuery = /* groq */ `*[_type == "post" && _id == $id && language == $lang][0]`

export function getPostQuery(
  request: { lang: SupportedLanguage } & ({ slug: string } | { id: string }),
) {
  if ('id' in request) {
    return {
      query: postByIdQuery,
      params: {
        id: request.id,
        lang: request.lang,
      },
    }
  }

  return {
    query: postBySlugQuery,
    params: {
      slug: request.slug,
      lang: request.lang,
    },
  }
}

export const postSlugsQuery = /* groq */ `
*[_type == "post" && defined(slug.current)][].slug.current
`

export interface Post {
  _type: 'post'
  _id: string
  _createdAt: string
  language?: SupportedLanguage
  title?: string
  slug: Slug
  excerpt?: string
  mainImage?: ImageAsset
  body: PortableTextBlock[]
}

export type PostCard = Pick<
  Post,
  '_id' | 'title' | 'slug' | 'excerpt' | 'language' | 'mainImage' | '_createdAt'
>
