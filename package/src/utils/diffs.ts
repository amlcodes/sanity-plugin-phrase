import { Mutation } from '@sanity/mutator'
import { fromString, get, toString } from '@sanity/util/paths'
import { PatchOperations, Path, SanityDocument } from 'sanity'
import { PathSegment, diffPatch } from 'sanity-diff-patch'
import {
  SanityDocumentWithPhraseMetadata,
  TranslationDiff,
  TranslationDiffInsert,
  TranslationDiffSet,
  TranslationDiffUnset,
} from '../types'
import { undraftId } from './ids'
import { diffIsFullDoc } from './paths'
import { STATIC_DOC_KEYS } from './constants'

/**
 * Get the TranslationDiff[] that have changed between two versions of a document.
 *
 * We can't rely on `sanity-diff-patch`: it calculates the minimal set of patches needed
 * to get `historicVersion` to become `currentVersion`, but we need to optimize our patches
 * to be reliable across translations that take weeks.
 *
 * For example, if an element of an array was removed at position 0, and then a new one was
 * added, `sanity-diff-patch` would calculate that as a series of `set` operations, even
 * changing the item's `_key`. On certain edge cases, this would lead to incorrect formatting
 * on PortableText marks, patches that can't be applied, etc.
 *
 * Instead, we'd rather first remove the item at position 0, via its `_key` if possible (unchanged
 * across reorders), and then insert the new one at that position, preferrably anchored on
 * the `_key` of its prev/next siblings.
 *
 * This function has a simpler algorithm that makes a few assumptions:
 * 1. First, keep track of object properties or keyed array items that were either added
 *   or removed in the new version
 * 2. Then, for unkeyed array items, if any of them changed, set the entire array instead of
 *   trying to patch it
 * 3. Finally, apply these patches to the historic version, and compare it to the current with
 *   `sanity-diff-patch` for properties that changed their value but kept their path
 *
 * It's slightly more inefficient, sending extra data to Phrase, but leads to more robust and
 * reliable results.
 */
export function getDiffs({
  currentVersion,
  historicVersion,
}: {
  currentVersion?: SanityDocumentWithPhraseMetadata
  historicVersion?: SanityDocumentWithPhraseMetadata
}): TranslationDiff[] {
  if (!currentVersion || !historicVersion) return []

  const unsettedPaths = getUnsettedPaths({
    currentVersion,
    historicVersion,
  })
  const insertedPaths = getInsertedPaths({
    currentVersion,
    historicVersion,
  })
  const resetArrayPaths = getArrayOfPrimitivesResets({
    currentVersion,
    historicVersion,
  })

  const preDiffPatchDiffs = [
    ...unsettedPaths,
    ...insertedPaths,
    ...resetArrayPaths,
  ]
  const diffPatches = diffPatch(
    {
      ...(preDiffPatchDiffs.length > 0
        ? applyDiffs({
            startingDocument: historicVersion,
            updatedDocument: currentVersion,
            diffs: preDiffPatchDiffs,
          })
        : historicVersion),
      _id: undraftId(historicVersion._id),
    },
    { ...currentVersion, _id: undraftId(currentVersion._id) },
  )

  const setDiffs = diffPatches.flatMap(({ patch }): TranslationDiffSet[] => {
    const toSet = {
      ...('set' in patch ? patch.set : {}),
      ...('diffMatchPatch' in patch ? patch.diffMatchPatch : {}),
    }

    return Object.keys(toSet).map((path) => ({
      op: 'set',
      path: fromString(path),
    }))
  })
  const allDiffs = [
    ...unsettedPaths,
    ...insertedPaths,
    ...resetArrayPaths,
    ...setDiffs,
  ]
  const pathKeys = allDiffs.map((diff) => toString(diff.path))

  return allDiffs.filter((diff, index) => {
    const key = toString(diff.path)
    return pathKeys.indexOf(key) === index
  })
}

/**
 * For unkeyed arrays, we can't reliably do surgical diffs: indexes could change in
 * unpredictable ways between content in Phrase and the ever-changing draft in Sanity.
 *
 * So instead of surgical changes, we just set the entire array if any of its items has changed.
 * @see `getArrayOfPrimitivesResets()`
 */
function isChangedArrayOfPrimitives(
  historicVersion: unknown[],
  currentVersion: unknown[],
) {
  const isKeyedArray = historicVersion.every(
    (item) => typeof getDataKey(item) === 'string',
  )
  if (isKeyedArray) return false

  return (
    historicVersion.length !== currentVersion.length ||
    diffPatch(
      { _id: 'fake-id', arr: historicVersion },
      { _id: 'fake-id', arr: currentVersion },
    ).length > 0
  )
}

export function getUnsettedPaths({
  currentVersion,
  historicVersion,
  basePath = [],
}: {
  currentVersion: unknown
  historicVersion: unknown
  basePath?: Path
}): TranslationDiffUnset[] {
  if (
    typeof historicVersion !== 'object' ||
    !historicVersion ||
    // If there's a mismatch of data types between them, we can't analyze the differences
    typeof currentVersion !== typeof historicVersion ||
    Array.isArray(historicVersion) !== Array.isArray(currentVersion)
  )
    return []

  if (Array.isArray(historicVersion)) {
    // Let `getArrayOfPrimitivesResets` handle unbalanced unkeyed arrays
    if (
      isChangedArrayOfPrimitives(
        historicVersion,
        currentVersion as typeof historicVersion,
      )
    ) {
      return []
    }

    return historicVersion.flatMap((item, i) => {
      const itemKey = getDataKey(item)
      const pathSegment: PathSegment = itemKey ? { _key: itemKey } : i
      const fullPath: Path = [...basePath, pathSegment]
      const isRemoved =
        valueExists(item) && !pathExistsInData([pathSegment], currentVersion)

      // No need to process children if the entire parent is missing
      if (isRemoved) return { path: fullPath, op: 'unset' }

      // Process array item's content
      return getUnsettedPaths({
        currentVersion: get(currentVersion, [pathSegment]),
        historicVersion: item,
        basePath: fullPath,
      })
    })
  }

  return Object.entries(historicVersion).flatMap(([property, value]) => {
    const pathSegment: PathSegment = property
    const fullPath: Path = [...basePath, pathSegment]
    const isRemoved =
      valueExists(value) && !pathExistsInData([pathSegment], currentVersion)

    // No need to process children if the entire parent is missing
    if (isRemoved) return { path: fullPath, op: 'unset' }

    // Process object property's content
    return getUnsettedPaths({
      currentVersion: get(currentVersion, [pathSegment]),
      historicVersion: value,
      basePath: fullPath,
    })
  }, [] as Path[])
}

export function getInsertedPaths({
  currentVersion,
  historicVersion,
  basePath = [],
}: {
  currentVersion: unknown
  historicVersion: unknown
  basePath?: Path
}): TranslationDiffInsert[] {
  return getUnsettedPaths({
    currentVersion: historicVersion,
    historicVersion: currentVersion,
    basePath,
  }).map(({ path }): TranslationDiffInsert => {
    const parentPath = path.slice(0, -1)
    const currentParent = get(currentVersion, parentPath)
    const historicParent = get(historicVersion, parentPath)
    if (!Array.isArray(currentParent))
      return {
        path,
        op: 'insert',
      }

    const value = get(currentVersion, path)
    const valueKey = getDataKey(value)
    const index = currentParent.findIndex((item) => {
      const itemKey = getDataKey(item)

      return itemKey && valueKey ? itemKey === valueKey : item === value
    })

    const prevItemAlsoInHistoric =
      Array.isArray(historicParent) &&
      currentParent
        .slice(0, index)
        .reverse()
        .find((item) =>
          historicParent.some(
            (i) => getDataKey(i) && getDataKey(i) === getDataKey(item),
          ),
        )
    const prevKey = getDataKey(prevItemAlsoInHistoric)
    const nextItemAlsoInHistoric =
      Array.isArray(historicParent) &&
      currentParent
        .slice(index + 1)
        .find((item) =>
          historicParent.some(
            (i) => getDataKey(i) && getDataKey(i) === getDataKey(item),
          ),
        )
    const nextKey = getDataKey(nextItemAlsoInHistoric)

    return {
      path,
      op: 'insert',
      insertAt: {
        index,
        nextKey,
        prevKey,
      },
    }
  })
}

export function getArrayOfPrimitivesResets({
  currentVersion,
  historicVersion,
  basePath = [],
}: {
  currentVersion: unknown
  historicVersion: unknown
  basePath?: Path
}): TranslationDiffSet[] {
  if (
    typeof historicVersion !== 'object' ||
    !historicVersion ||
    // If there's a mismatch of data types between them, we can't analyze the differences
    typeof currentVersion !== typeof historicVersion ||
    Array.isArray(historicVersion) !== Array.isArray(currentVersion)
  )
    return []

  if (Array.isArray(historicVersion)) {
    if (
      isChangedArrayOfPrimitives(
        historicVersion,
        currentVersion as typeof historicVersion,
      )
    ) {
      return [{ path: basePath, op: 'set' }]
    }

    return historicVersion.flatMap((item, i) => {
      const itemKey = getDataKey(item)
      const pathSegment: PathSegment = itemKey ? { _key: itemKey } : i
      const fullPath: Path = [...basePath, pathSegment]

      // Process array item's content
      return getArrayOfPrimitivesResets({
        currentVersion: get(currentVersion, [pathSegment]),
        historicVersion: item,
        basePath: fullPath,
      })
    })
  }

  return Object.entries(historicVersion).flatMap(([property, value]) => {
    const pathSegment: PathSegment = property
    const fullPath: Path = [...basePath, pathSegment]

    // Process object property's content
    return getArrayOfPrimitivesResets({
      currentVersion: get(currentVersion, [pathSegment]),
      historicVersion: value,
      basePath: fullPath,
    })
  }, [] as Path[])
}

export function applyPatches<Doc extends SanityDocument>(
  document: Doc,
  patches: PatchOperations[],
) {
  return (Mutation.applyAll(document, [
    new Mutation({
      mutations: patches.map((patchOperations) => ({
        patch: { ...patchOperations, id: document._id },
      })),
    }),
  ]) || document) as Doc
}

export function applyDiffs({
  startingDocument,
  updatedDocument,
  diffs,
}: {
  startingDocument: SanityDocument
  updatedDocument: SanityDocument
  diffs: TranslationDiff[]
}) {
  // If changing the entire root, no need to apply patches
  if (diffs.length === 0 || diffIsFullDoc(diffs[0])) return updatedDocument

  const patches = diffsToPatches({
    diffs: diffs,
    updatedDocument,
  })

  return applyPatches(startingDocument, patches)
}

function insertDiffToPatch(
  { path, insertAt }: TranslationDiffInsert,
  value: unknown,
): PatchOperations {
  // Only array items have `insertAt`
  if (!insertAt) {
    return {
      set: {
        [toString(path)]: value,
      },
    }
  }

  const parentPath = path.slice(0, -1)
  let insertPosition: Omit<PatchOperations['insert'], 'items'> = {
    after: toString([...parentPath, insertAt.index - 1]),
  }

  if (insertAt.prevKey) {
    insertPosition = {
      after: toString([...parentPath, { _key: insertAt.prevKey }]),
    }
  }

  // Similarly to Sanity's Mutator, give preference to `before` over `after`
  if (insertAt.nextKey) {
    insertPosition = {
      before: toString([...parentPath, { _key: insertAt.nextKey }]),
    }
  }

  return {
    insert: {
      ...insertPosition,
      items: [value],
    } as PatchOperations['insert'],
  }
}

export function diffToPatch(
  diff: TranslationDiff,
  value: unknown,
): PatchOperations {
  if (diff.op === 'unset') {
    return {
      unset: [toString(diff.path)],
    }
  }

  if (diff.op === 'set') {
    // If setting the entire document, `set` is the value itself, minus
    // fields we don't want to change
    if (diff.path.length === 0 && typeof value === 'object' && !!value) {
      return {
        set: Object.fromEntries(
          Object.entries(value).filter(
            ([key]) => !STATIC_DOC_KEYS.includes(key as any),
          ),
        ),
      }
    }

    return {
      set: {
        [toString(diff.path)]: value,
      },
    }
  }

  if (diff.op === 'insert') {
    return insertDiffToPatch(diff, value)
  }

  return {}
}

function diffsToPatches({
  diffs,
  updatedDocument,
}: {
  diffs: TranslationDiff[]
  updatedDocument: SanityDocument
}) {
  return diffs.map((diff) => {
    const value = (() => {
      try {
        return get(updatedDocument, diff.path)
      } catch (error) {
        return undefined
      }
    })()

    return diffToPatch(diff, value)
  })
}

function getDataKey(data: unknown) {
  if (
    typeof data !== 'object' ||
    !data ||
    !('_key' in data) ||
    typeof data._key !== 'string'
  )
    return undefined

  return data._key || undefined
}

function pathExistsInData(path: Path, data: unknown) {
  try {
    const value = get(data, path)
    return valueExists(value)
  } catch (error) {
    return false
  }
}

function valueExists(value: unknown) {
  return typeof value !== 'undefined' && value !== null
}
