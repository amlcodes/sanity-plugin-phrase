import { PortableText } from '@portabletext/react'
import Image from 'next/image'

import Container from '~/components/Container'
import { urlForImage } from '~/lib/sanity.image'
import { type Post } from '~/lib/sanity.queries'
import { formatDate } from '~/utils'

export default function PostPage({ data: post }: { data: Post }) {
  const mainImageUrl = post.mainImage && urlForImage(post.mainImage)?.url()
  return (
    <Container>
      <section className="post">
        {mainImageUrl ? (
          <Image
            className="post__cover"
            src={mainImageUrl}
            height={231}
            width={367}
            alt=""
          />
        ) : (
          <div className="post__cover--none" />
        )}
        <div className="post__container">
          <h1 className="post__title">{post.title}</h1>
          <p className="post__excerpt">{post.excerpt}</p>
          <p className="post__date">{formatDate(post._createdAt)}</p>
          <div className="post__content">
            <PortableText value={post.body} />
          </div>
        </div>
      </section>
    </Container>
  )
}
