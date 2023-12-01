import { Path } from 'sanity'
import { CrossSystemLangCode, SanityPTD, SanityTMD } from '../types'
import { pathToString } from './paths'
import { PTD_ID_PREFIX, TMD_ID_PREFIX } from './constants'

/**
 * Ensures a given string is suitable to serve as a document's _id or an array item's _key in Sanity.
 */
export function makeKeyAndIdFriendly(str: string) {
  return (
    str
      // Remove all characters that aren't letters, numbers, or periods
      ?.replace(/[^\d\w.]/g, '_')
      // Remove repeated underscores
      .replace(/_{2,}/, '_') || ''
  )
}

export function getTranslationKey(paths: Path[], _rev: string) {
  return [...paths.map(pathToString), _rev].map(makeKeyAndIdFriendly).join('__')
}

export function undraftId(id: string) {
  return id.replace('drafts.', '')
}

export function draftId(id: string) {
  return `drafts.${undraftId(id)}`
}

export function isDraft(id: string) {
  return undraftId(id) !== id
}

export function getPtdId({
  targetLang,
  translationKey,
}: {
  translationKey: string
  targetLang: CrossSystemLangCode
}): SanityPTD['_id'] {
  return `${PTD_ID_PREFIX}.${targetLang.phrase}--${translationKey}`
}

export function getTmdId(translationKey: string): SanityTMD['_id'] {
  return `${TMD_ID_PREFIX}.${translationKey}`
}

export function isPtdId(id: string) {
  return undraftId(id).startsWith(PTD_ID_PREFIX)
}
