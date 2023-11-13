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
}: {
  paths: TranslationRequest['paths']
  sourceDoc: Pick<TranslationRequest['sourceDoc'], '_id' | '_rev'>
  targetLang: CrossSystemLangCode
}) {
  // @TODO: is it safe not to include the source document's ID? Is _rev unique system-wide?
  return `${
    undraftId(sourceDoc._id) !== sourceDoc._id ? 'drafts.' : ''
  }phrase-translation--${targetLang.phrase}--${getTranslationKey(
    paths,
    sourceDoc._rev,
  )}`
}

export function isPtdId(id: string) {
  return undraftId(id).startsWith('phrase-translation--')
}
