import { Mutation } from '@sanity/mutator'
import { fromString, get, toString } from '@sanity/util/paths'
import { PatchOperations, Path, SanityDocument } from 'sanity'
import { PathSegment, diffPatch } from 'sanity-diff-patch'
import {
  TranslationDiff,
  TranslationDiffInsert,
  TranslationDiffSet,
  TranslationDiffUnset,
  SanityDocumentWithPhraseMetadata,
} from '../types'
import { undraftId } from './ids'

/**
 * Get the DiffPath[] that have changed between two versions of a document.
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

  const diffPatches = diffPatch(
    {
      ...applyDiffs({
        startingDocument: historicVersion,
        updatedDocument: currentVersion,
        diffs: [...unsettedPaths, ...insertedPaths, ...resetArrayPaths],
      }),
      _id: undraftId(historicVersion._id),
    },
    { ...currentVersion, _id: undraftId(currentVersion._id) },
  )

  const setDiffPaths = diffPatches.flatMap(
    ({ patch }): TranslationDiffSet[] => {
      if (!('set' in patch)) return []

      return Object.keys(patch.set).map((path) => ({
        op: 'set',
        path: fromString(path),
      }))
    },
  )
  const allDiffPaths = [
    ...unsettedPaths,
    ...insertedPaths,
    ...resetArrayPaths,
    ...setDiffPaths,
  ]
  const pathKeys = allDiffPaths.map((diffPath) => toString(diffPath.path))

  return allDiffPaths.filter((diffPath, index) => {
    const key = toString(diffPath.path)
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
    const parentValue = get(currentVersion, parentPath)
    if (!Array.isArray(parentValue))
      return {
        path,
        op: 'insert',
      }

    const value = get(currentVersion, path)
    const valueKey = getDataKey(value)
    const index = parentValue.findIndex((item) => {
      const itemKey = getDataKey(item)

      return itemKey && valueKey ? itemKey === valueKey : item === value
    })
    const prevItem = parentValue[index - 1]
    const prevKey = getDataKey(prevItem)
    const nextItem = parentValue[index + 1]
    const nextKey = getDataKey(nextItem)

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
  if (diffs.length === 0) return updatedDocument

  const patches = diffPathsToPatches({
    diffPaths: diffs,
    updatedDocument,
  })

  return applyPatches(startingDocument, patches)
}

function insertDiffPathToPatch(
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

export function diffPathToPatch(
  diffPath: TranslationDiff,
  value: unknown,
): PatchOperations {
  if (diffPath.op === 'unset') {
    return {
      unset: [toString(diffPath.path)],
    }
  }

  if (diffPath.op === 'set') {
    return {
      set: {
        [toString(diffPath.path)]: value,
      },
    }
  }

  if (diffPath.op === 'insert') {
    return insertDiffPathToPatch(diffPath, value)
  }

  return {}
}

function diffPathsToPatches({
  diffPaths,
  updatedDocument,
}: {
  diffPaths: TranslationDiff[]
  updatedDocument: SanityDocument
}) {
  return diffPaths.map((diffPath) => {
    const value = (() => {
      try {
        return get(updatedDocument, diffPath.path)
      } catch (error) {
        return undefined
      }
    })()

    return diffPathToPatch(diffPath, value)
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
