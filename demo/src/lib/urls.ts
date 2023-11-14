import { SanityDocument } from 'sanity'

import { SupportedLanguage } from '~/utils'

import { Post, PostCard } from './sanity.queries'

export function pathToAbsUrl(path?: string): string | undefined {
  if (typeof path !== 'string') return

  return (
    process.env.NEXT_PUBLIC_BASE_URL +
    // When creating absolute URLs, ensure the homepage doesn't have a trailing slash
    (path === '/' ? '' : formatPath(path))
  )
}

function localizePath(path: string, language: SupportedLanguage) {
  return language === 'en'
    ? formatPath(path)
    : formatPath(`/${language}/${path}`)
}

export function getPostPath(post: Pick<Post | PostCard, 'slug' | 'language'>) {
  return localizePath(post.slug.current, post.language || 'en')
}

export function getDocPath(doc: SanityDocument) {
  if (doc._type === 'post') {
    return getPostPath(doc as unknown as Post)
  }

  return '/'
}

/**
 * Removes leading and trailing slashes from a string.
 */
export function stripMarginSlashes(path: string): string {
  if (typeof path !== 'string') return path

  return removeDoubleSlashes(path).replace(/^\/|\/$/g, '')
}

export function removeDoubleSlashes(path: string): string {
  if (typeof path !== 'string') return path

  return path.replace(/\/{2,}/g, '/')
}

export function formatPath(path?: string): string {
  if (typeof path !== 'string') {
    return '/'
  }

  return `/${stripMarginSlashes(path)}`
}
