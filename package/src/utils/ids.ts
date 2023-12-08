import {
  CrossSystemLangCode,
  TranslationDiff,
  SanityPTD,
  SanityTMD,
} from '../types'
import { PTD_ID_PREFIX, TMD_ID_PREFIX } from './constants'
import { pathToString } from './paths'

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

/** Used as an id and _key for the translation. Never gets parsed back to its contents. */
export function getTranslationKey(diffs: TranslationDiff[], _rev: string) {
  return [...diffs.map(({ path }) => pathToString(path)), _rev]
    .map(makeKeyAndIdFriendly)
    .join('__')
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
