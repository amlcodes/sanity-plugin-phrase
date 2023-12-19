import Image from 'next/image'

import { urlForImage } from '~/lib/sanity.image'
import { PostCard } from '~/lib/sanity.queries'
import { getPostPath } from '~/lib/urls'
import { formatDate, getReadableLanguageName } from '~/utils'

export default function Card({ post }: { post: PostCard }) {
  const mainImageUrl = post.mainImage && urlForImage(post.mainImage)?.url()

  return (
    <div className="card">
      {mainImageUrl ? (
        <Image
          className="card__cover"
          src={mainImageUrl}
          height={300}
          width={500}
          alt=""
        />
      ) : (
        <div className="card__cover--none" />
      )}
      <div className="card__container">
        {post.language && (
          <p style={{ opacity: 0.8, marginBottom: '-1em' }}>
            {getReadableLanguageName(post.language)}
          </p>
        )}
        <h3 className="card__title">
          <a className="card__link" href={getPostPath(post)}>
            {post.title}
          </a>
        </h3>
        <p className="card__excerpt">{post.excerpt}</p>
        <p className="card__date">{formatDate(post._createdAt)}</p>
      </div>
    </div>
  )
}
