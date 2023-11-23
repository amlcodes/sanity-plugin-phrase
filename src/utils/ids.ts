import { Path } from 'sanity'
import { CrossSystemLangCode, SanityPTD, SanityTMD } from '../types'
import { pathToString } from './paths'

export function makeKeyFriendly(str: string) {
  return str.replace('-', '_')
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
  return `phrase.ptd.${targetLang.phrase}--${translationKey}`
}

export function getTmdId(translationKey: string): SanityTMD['_id'] {
  return `phrase.tmd.${translationKey}`
}

export function isPtdId(id: string) {
  return undraftId(id).startsWith('phrase-translation--')
}
