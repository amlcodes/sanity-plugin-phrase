import { fromString, numEqualSegments, toString } from '@sanity/util/paths'
import { Path } from 'sanity'
import { diffPatch } from 'sanity-diff-patch'
import {
  CreateTranslationsInput,
  METADATA_KEY,
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
  TranslationRequest,
} from '../types'
import { dedupeArray } from './arrays'
import { ROOT_PATH_STR } from './constants'
import { undraftId } from './ids'

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
  currentVersion?: SanityDocumentWithPhraseMetadata,
  historicVersion?: SanityDocumentWithPhraseMetadata,
): Path[] {
  if (!currentVersion || !historicVersion) return []

  const diffPatches = diffPatch(
    { ...historicVersion, _id: undraftId(historicVersion._id) },
    { ...currentVersion, _id: undraftId(currentVersion._id) },
  )
  const pathsChanged = diffPatches.flatMap(({ patch }) => {
    const paths: string[] = []
    if ('set' in patch) {
      paths.push(...Object.keys(patch.set))
    }
    if ('insert' in patch) {
      const itemPaths = patch.insert.items.map((item) => {
        let base = ''

        if ('before' in patch.insert) {
          base = patch.insert.before
        }
        if ('after' in patch.insert) {
          base = patch.insert.after
        }
        if ('replace' in patch.insert) {
          base = patch.insert.replace
        }

        /** `content[_key == "3dadae45cc25"].blurbs[-1]` -> `content[_key == "3dadae45cc25"].blurbs` */
        base = base.split('[').slice(0, -1).join('[')

        const selector =
          typeof item === 'object' && '_key' in item ? item._key : undefined

        // When we can't ask to translate a specific key, all we'd have is an index, which
        // we can't be sure would point to the right item to be translated.
        // In this case, better to translate the entire parent field.
        if (!selector) return base

        return `${base}[_key == "${selector}"]`
      })
      paths.push(...itemPaths)
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

export function getPathsKey(paths: Path[]) {
  return (
    paths
      ?.map((p) => pathToString(p))
      .sort((a, b) => a.localeCompare(b))
      .join('||') || ''
  )
}

export function parsePathsString(pathsString: string): Path[] {
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
