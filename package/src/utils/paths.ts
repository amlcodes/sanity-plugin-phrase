import { fromString, numEqualSegments, toString } from '@sanity/util/paths'
import { Path } from 'sanity'
import { diffPatch } from 'sanity-diff-patch'
import {
  CreateTranslationsInput,
  METADATA_KEY,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '../types'
import { dedupeArray } from './arrays'
import { ROOT_PATH_STR } from './constants'

export function translationsIntersect(a: Path, b: Path) {
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

export function getChangedPaths(
  currentVersion: SanityDocumentWithPhraseMetadata,
  historicVersion: SanityDocumentWithPhraseMetadata,
): Path[] {
  const diffPatches = diffPatch(historicVersion, currentVersion)
  const pathsChanged = diffPatches.flatMap(({ patch }) => {
    const paths: string[] = []
    if ('set' in patch) {
      paths.push(...Object.keys(patch.set))
    }
    if ('unset' in patch) {
      paths.push(...Object.keys(patch.unset))
    }
    if ('diffMatchPatch' in patch) {
      paths.push(...Object.keys(patch.diffMatchPatch))
    }

    return paths
  })

  return (
    dedupeArray(pathsChanged)
      .map((stringPath) => fromString(stringPath))
      // remove paths that are contained in others
      .filter(
        (path, i, arr) =>
          !arr.slice(i + 1).some((p) => pathIsDescendantOf(path, p)),
      )
  )
}

export function joinPathsByRoot(paths: Path[]) {
  return paths.reduce(
    (byRoot, path) => {
      const root = path[0] ? toString([path[0]]) : ROOT_PATH_STR
      return {
        ...byRoot,
        [root]: [...(byRoot[root] || []), path],
      }
    },
    {} as { [root: string]: Path[] },
  )
}

export function tPathInMainDoc(translationKey: string) {
  return `${METADATA_KEY}.translations[_key == "${translationKey}"]`
}

export function formatInputPaths(inputPaths: CreateTranslationsInput['paths']) {
  return (
    Array.isArray(inputPaths) && inputPaths.length > 0 ? inputPaths : [[]]
  ).map((p) =>
    typeof p === 'string' ? fromString(p) : p || [],
  ) as TranslationRequest['paths']
}
