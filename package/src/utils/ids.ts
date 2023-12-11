import JsSHA from 'jssha'
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

/** Used as an id and _key for the translation. */
export function getTranslationKey({
  diffs,
  _rev,
  _id,
}: {
  diffs: TranslationDiff[]
  _rev: string
  _id: string
}) {
  const templatedId = [
    ...diffs.map(({ path }) => pathToString(path)),
    _id.replace('.', '_'),
    _rev,
  ]
    .map(makeKeyAndIdFriendly)
    .join('__')

  const sha = new JsSHA('SHA-256', 'TEXT', { encoding: 'UTF8' })
  sha.update(templatedId)
  // Never gets parsed back to its contents.
  return sha.getHash('HEX').slice(0, 8)
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
