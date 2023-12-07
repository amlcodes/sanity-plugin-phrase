import { fromString, numEqualSegments, toString } from '@sanity/util/paths'
import { Path } from 'sanity'
import {
  CreateTranslationsInput,
  DiffPath,
  METADATA_KEY,
  MainDocTranslationMetadata,
  SanityLangCode,
  TranslationRequest,
} from '../types'
import { ROOT_PATH_STR } from './constants'

export function translationPathsIntersect(a: Path, b: Path) {
  if (JSON.stringify(a) === JSON.stringify(b)) return true

  const count = numEqualSegments(a, b)

  const smaller = a.length > b.length ? b : a
  const longer = a.length > b.length ? a : b

  const shareSameRoot = smaller.every((segment, i) => segment === longer[i])
  return count > 0 && shareSameRoot
}

export function pathIsDescendantOf(path: Path, ancestor: Path) {
  if (path.length <= ancestor.length) return false

  return ancestor.every((segment, i) => segment === path[i])
}

export function pathToString(path: Path) {
  if (path.length === 0) return ROOT_PATH_STR

  return toString(path)
}

export function stringToPath(str: string): Path {
  if (str === ROOT_PATH_STR) return []

  return fromString(str)
}

export const FULL_DOC_DIFF_PATH: DiffPath = {
  op: 'set',
  path: [],
}

export function joinPathsByRoot(paths: DiffPath[]) {
  return paths.reduce(
    (byRoot, p) => {
      const root = p.path[0] ? toString([p.path[0]]) : ROOT_PATH_STR
      return {
        ...byRoot,
        [root]: [...(byRoot[root] || []), p],
      }
    },
    {} as { [root: string]: typeof paths },
  )
}

export function tPathInMainDoc(translationKey: string) {
  return `${METADATA_KEY}.translations[_key == "${translationKey}"]`
}

export function formatInputPaths(
  inputPaths: CreateTranslationsInput['paths'],
): TranslationRequest['paths'] {
  return Array.isArray(inputPaths) && inputPaths.length > 0
    ? inputPaths
    : [FULL_DOC_DIFF_PATH]
}

/** Returns a predictable string for a given path, that can be
 * used for joining translations / targets / staleness together */
export function getPathsKey(paths: (DiffPath | Path)[]) {
  return (
    paths
      ?.map((p) => pathToString(Array.isArray(p) ? p : p.path))
      .sort((a, b) => a.localeCompare(b))
      .join('||') || ''
  )
}

export function parsePathsString(
  pathsString: MainDocTranslationMetadata['paths'],
): DiffPath[] {
  try {
    return JSON.parse(pathsString) as TranslationRequest['paths']
  } catch (error) {
    return []
  }
}

export function joinLangsByPath(
  entries: { lang: SanityLangCode; paths: TranslationRequest['paths'] }[] = [],
) {
  return entries.reduce(
    (byPath, t) => {
      if (!('paths' in t) || !t.paths.length) return byPath

      const pathKey = getPathsKey(t.paths)
      return {
        ...byPath,
        [pathKey]: {
          langs: [...(byPath[pathKey]?.langs || []), t.lang],
          paths: t.paths,
        },
      }
    },
    {} as Record<
      string,
      {
        langs: SanityLangCode[]
        paths: TranslationRequest['paths']
      }
    >,
  )
}
