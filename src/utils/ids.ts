import { Path } from '@sanity/types'
import { CrossSystemLangCode, TranslationRequest } from '../types'
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
  sourceDoc,
  paths,
}: Pick<TranslationRequest, 'sourceDoc' | 'paths'> & {
  targetLang: CrossSystemLangCode
}) {
  return `${
    undraftId(sourceDoc._id) !== sourceDoc._id ? 'drafts.' : ''
  }phrase-translation--${targetLang.phrase}--${getTranslationKey(
    paths,
    sourceDoc._rev,
  )}`
}
