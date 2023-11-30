import { Path } from 'sanity'
import { CrossSystemLangCode, SanityPTD, SanityTMD } from '../types'
import { pathToString } from './paths'
import { PTD_ID_PREFIX, TMD_ID_PREFIX } from './constants'

export function makeKeyFriendly(str: string) {
  return str?.replace('-', '_') || ''
}

export function getTranslationKey(paths: Path[], _rev: string) {
  return [...paths.map(pathToString), _rev].map(makeKeyFriendly).join('__')
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
