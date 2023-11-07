import { Path } from '@sanity/types'
import { fromString, numEqualSegments, toString } from '@sanity/util/paths'
import { FILENAME_PREFIX, ROOT_PATH_STR } from './constants'
import { Phrase, TranslationRequest } from './types'

export function translationsIntersect(a: Path, b: Path) {
  if (JSON.stringify(a) === JSON.stringify(b)) return true

  const count = numEqualSegments(a, b)

  const smaller = a.length > b.length ? b : a
  const longer = a.length > b.length ? a : b

  const shareSameRoot = smaller.every((segment, i) => segment === longer[i])
  return count > 0 && shareSameRoot
}

export function pathToString(path: Path) {
  if (path.length === 0) return ROOT_PATH_STR

  return toString(path)
}

export function stringToPath(str: string): Path {
  if (str === ROOT_PATH_STR) return []

  return fromString(str)
}

export function makeKeyFriendly(str: string) {
  return str.replace('-', '_')
}

export function getTranslationKey(paths: Path[], _rev: string) {
  return [...paths.map(pathToString), _rev].map(makeKeyFriendly).join('__')
}

// @TODO create friendlier names - requires schema
export function getTranslationName({ sourceDoc, paths }: TranslationRequest) {
  const name = `${FILENAME_PREFIX} ${sourceDoc._type} ${getTranslationKey(
    paths,
    sourceDoc._rev,
  )} ${sourceDoc._id}`
  return {
    name,
    filename: `${name}.json`,
  }
}

export function jobComesFromSanity(
  job:
    | Pick<Phrase['JobPart'], 'filename'>
    | Pick<Phrase['JobInWebhook'], 'fileName'>,
) {
  const name =
    'filename' in job
      ? job.filename
      : 'fileName' in job
      ? job.fileName
      : undefined
  return name && name.startsWith(FILENAME_PREFIX)
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

export function dedupeArray<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

export function getPtdId({
  targetLang,
  sourceDoc,
  paths,
}: Pick<TranslationRequest, 'sourceDoc' | 'paths'> & { targetLang: string }) {
  return `${
    undraftId(sourceDoc._id) !== sourceDoc._id ? 'drafts.' : ''
  }phrase-translation--${targetLang}--${getTranslationKey(
    paths,
    sourceDoc._rev,
  )}`
}
