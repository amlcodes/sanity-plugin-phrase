import { fromString, numEqualSegments, toString } from '@sanity/util/paths'
import { Path } from 'sanity'
import {
  CreateTranslationsInput,
  TranslationDiff,
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

export const FULL_DOC_DIFF_PATH: TranslationDiff = {
  op: 'set',
  path: [],
}

export function joinDiffsByRoot(diffs: TranslationDiff[]) {
  return diffs.reduce(
    (byRoot, p) => {
      const root = p.path[0] ? toString([p.path[0]]) : ROOT_PATH_STR
      return {
        ...byRoot,
        [root]: [...(byRoot[root] || []), p],
      }
    },
    {} as { [root: string]: typeof diffs },
  )
}

export function tPathInMainDoc(translationKey: string) {
  return `${METADATA_KEY}.translations[_key == "${translationKey}"]`
}

export function formatInputDiffs(
  inputDiffs: CreateTranslationsInput['diffs'],
): TranslationRequest['diffs'] {
  return Array.isArray(inputDiffs) && inputDiffs.length > 0
    ? inputDiffs
    : [FULL_DOC_DIFF_PATH]
}

/** Returns a predictable string for a given path, that can be
 * used for joining translations / targets / staleness together */
export function getDiffsKey(diffs: TranslationDiff[]) {
  return (
    diffs
      ?.map(({ path }) => pathToString(path))
      .sort((a, b) => a.localeCompare(b))
      .join('||') || ''
  )
}

export function parseStringifiedDiffs(
  stingifiedDiffs: MainDocTranslationMetadata['diffs'],
): TranslationDiff[] {
  try {
    return JSON.parse(stingifiedDiffs) as TranslationRequest['diffs']
  } catch (error) {
    return []
  }
}

export function joinLangsByDiffs(
  entries: { lang: SanityLangCode; diffs: TranslationRequest['diffs'] }[] = [],
) {
  return entries.reduce(
    (byDiff, t) => {
      if (!('diffs' in t) || !t.diffs.length) return byDiff

      const pathKey = getDiffsKey(t.diffs)
      return {
        ...byDiff,
        [pathKey]: {
          langs: [...(byDiff[pathKey]?.langs || []), t.lang],
          diffs: t.diffs,
        },
      }
    },
    {} as Record<
      string,
      {
        langs: SanityLangCode[]
        diffs: TranslationRequest['diffs']
      }
    >,
  )
}
