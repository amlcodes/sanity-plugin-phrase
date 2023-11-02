import { Mutation, arrayToJSONMatchPath } from '@sanity/mutator'
import { PatchOperations, Path, SanityDocument } from '@sanity/types'
import { get, numEqualSegments, toString } from '@sanity/util/paths'
import { TranslationRequest } from './types'

export function pathsIntersect(a: Path, b: Path) {
  return JSON.stringify(a) === JSON.stringify(b) || numEqualSegments(a, b) > 0
}

const ROOT_PATH_STR = '__root'

export function pathToString(path: Path) {
  if (path.length === 0) return ROOT_PATH_STR

  return toString(path)
}

export function getTranslationKey(paths: Path[], _rev: string) {
  return [...paths.map(pathToString), _rev].join('::')
}

// @TODO create friendlier names - requires schema
export function getTranslationName({ sourceDoc, paths }: TranslationRequest) {
  const name = `[Sanity.io] ${sourceDoc._type} ${getTranslationKey(
    paths,
    sourceDoc._rev,
  )} ${sourceDoc._id}`
  return {
    name,
    filename: `${name}.json`,
  }
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

function getPatchOperations({
  originalDoc,
  changedDoc,
  path,
}: {
  originalDoc: SanityDocument
  changedDoc: SanityDocument
  path: Path
}): PatchOperations[] {
  let patches: PatchOperations[] = []

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
          set: {
            [arrayToJSONMatchPath(path)]: get(changedDoc, path),
          },
        },
      ]
    }
  })

  return patches
}

export function mergeDocs({
  originalDoc,
  changedDoc,
  paths,
}: {
  originalDoc: SanityDocument
  changedDoc: SanityDocument
  paths: Path[]
}) {
  if (paths.length === 0) return keepOriginalId(originalDoc, changedDoc)

  const patches = paths.flatMap((path) =>
    getPatchOperations({ originalDoc, changedDoc, path }),
  )
  console.log(patches)

  return keepOriginalId(
    originalDoc,
    Mutation.applyAll(originalDoc, [
      new Mutation({
        mutations: patches.map((patch) => ({
          patch: { ...patch, id: originalDoc._id },
        })),
      }),
    ]) as SanityDocument,
  )
}
