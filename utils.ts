import { Mutation, arrayToJSONMatchPath } from '@sanity/mutator'
import { PatchMutationOperation, Path, SanityDocument } from '@sanity/types'
import { get, numEqualSegments, toString } from '@sanity/util/paths'
import { TranslationRequest } from './types'

export function pathsIntersect(a: Path, b: Path) {
  return JSON.stringify(a) === JSON.stringify(b) || numEqualSegments(a, b) > 0
}

export function pathToString(path: Path) {
  if (path.length === 0) return 'root'

  return toString(path)
}

// @TODO create friendlier names - requires schema
export function getTranslationName({ sourceDoc, path }: TranslationRequest) {
  return `[Sanity.io] ${sourceDoc._type} ${pathToString(path)} ${sourceDoc._id}`
}

// @TODO: sturdier implementation
export function undraftId(id: string) {
  return id.replace('drafts.', '')
}

function keepOriginalId(
  originalDoc: SanityDocument,
  changedDoc: SanityDocument,
) {
  return {
    ...changedDoc,
    _id: originalDoc._id,
    _rev: originalDoc._rev,
    _type: originalDoc._type,
  }
}

export function mergeDocs(
  originalDoc: SanityDocument,
  changedDoc: SanityDocument,
  path: Path,
) {
  if (path.length === 0) return keepOriginalId(originalDoc, changedDoc)

  let patches: PatchMutationOperation[] = []

  path.forEach((segment, i) => {
    const parentPath = path.slice(0, i)
    const changedParentValue = get(changedDoc, parentPath)

    /**
     * If no parent value, set it to changedDoc's value
     * @example
     * // request:
     * { original: { title: "Original" }, changed: { title: "Changed", slug: { _type: 'slug', current: "changed-slug" } }, path: ['slug', 'current'] }
     *
     * // result
     * { title: "Original", slug: { _type: 'slug', current: "changed-slug" } }
     */
    if (parentPath.length > 0 && get(originalDoc, parentPath) === undefined) {
      patches = [
        ...patches,
        {
          id: originalDoc._id,
          setIfMissing: {
            [arrayToJSONMatchPath(parentPath)]: Array.isArray(
              changedParentValue,
            )
              ? // When an array, don't copy other properties
                []
              : // When an object, copy all properties
                changedParentValue,
          },
        },
      ]
    }

    const originalValue = get(originalDoc, path)
    /**
     * If modifying an array item that doesn't exist (parent is an array),
     * append full item to the array */
    if (Array.isArray(changedParentValue) && originalValue === undefined) {
      const indexInParent = changedParentValue.findIndex(
        (item) =>
          '_key' in item &&
          item._key === (get(changedParentValue, [segment]) as any)?._key,
      )
      patches = [
        ...patches,
        {
          id: originalDoc._id,
          insert: {
            items: [get(changedDoc, path)],
            before: arrayToJSONMatchPath([...parentPath, indexInParent]),
          },
        },
      ]
    }

    // For the final value itself, simply set it
    if (i === path.length - 1) {
      patches = [
        ...patches,
        {
          id: originalDoc._id,
          set: {
            [arrayToJSONMatchPath(path)]: get(changedDoc, path),
          },
        },
      ]
    }
  })
  /**
   * @TODO how to deal with edition of nested content when sourceDoc doesn't have parent paths?
   * Ex: sourceDoc has no `slug`, and `path` is `['slug', 'current']`. Currently, we just ignore it.
   * Should we copy the whole parent from `targetDoc` up until it exists in the sourceDoc's path?
   */

  return keepOriginalId(
    originalDoc,
    Mutation.applyAll(originalDoc, [
      new Mutation({
        mutations: patches.map((patch) => ({ patch })),
      }),
    ]) as SanityDocument,
  )
}
