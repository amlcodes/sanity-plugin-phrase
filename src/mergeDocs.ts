import { Mutation, arrayToJSONMatchPath } from '@sanity/mutator'
import { get } from '@sanity/util/paths'
import { PatchOperations, Path, SanityDocument } from 'sanity'
import phraseToSanity from './phraseToSanity'
import { METADATA_KEY, ReferenceMap } from './types'
import { injectTranslatedReferences } from './utils/references'

// @TODO: do we include language & i18n adapter specific things here?
const STATIC_KEYS = ['_id', '_rev', '_type', METADATA_KEY]

// @TODO: try using sanity-diff-patch instead. It has a basePath property we could perhaps leverage
export function mergeDocs<D extends SanityDocument>({
  originalDoc,
  changedDoc,
  paths,
}: {
  originalDoc: D
  changedDoc: D
  paths: Path[]
}): D {
  if (paths.length === 0) return keepStaticValues(originalDoc, changedDoc)

  const patches = paths.flatMap((path) =>
    getPatchOperations({ originalDoc, changedDoc, path }),
  )

  return keepStaticValues(
    originalDoc,
    Mutation.applyAll(originalDoc, [
      new Mutation({
        mutations: patches.map((patch) => ({
          patch: { ...patch, id: originalDoc._id },
        })),
      }),
    ]) as D,
  )
}

export function modifyDocInPath<D extends SanityDocument>({
  originalDoc,
  changedContent,
  path,
  referenceMap,
}: {
  originalDoc: D
  changedContent: ReturnType<typeof phraseToSanity>
  path: Path
  referenceMap: ReferenceMap
}): D {
  let updatedDoc = originalDoc
  // If entire document...
  if (typeof changedContent === 'object' && path.length === 0) {
    updatedDoc = mergeDocs({
      originalDoc,
      changedDoc: injectTranslatedReferences({
        data: changedContent,
        referenceMap,
      }) as D,
      paths: [path],
    })
  } else {
    // @TODO: currently will not take into consideration some of the behavior we have in `getPatchOperations` - do we need to care?
    updatedDoc = keepStaticValues(
      originalDoc,
      Mutation.applyAll(originalDoc, [
        new Mutation({
          mutations: [
            {
              patch: {
                id: originalDoc._id,
                set: {
                  [arrayToJSONMatchPath(path)]: injectTranslatedReferences({
                    data: changedContent,
                    referenceMap,
                  }),
                },
              },
            },
          ],
        }),
      ]) as D,
    )
  }

  return updatedDoc
}

export function getPatchOperations({
  originalDoc,
  changedDoc,
  path,
}: {
  originalDoc: SanityDocument
  changedDoc: SanityDocument
  path: Path
}): PatchOperations[] {
  // @TODO: can this be simpler?
  if (path.length === 0) {
    return Object.keys(changedDoc).flatMap((key) => {
      if (STATIC_KEYS.includes(key)) return []

      return {
        set: {
          [key]: get(changedDoc, [key]),
        },
      }
    })
  }

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

function keepStaticValues<D extends SanityDocument>(
  originalDoc: D,
  changedDoc: D,
): D {
  const finalDoc = { ...changedDoc }
  STATIC_KEYS.forEach((key) => {
    if (key in originalDoc) {
      // @ts-expect-error
      finalDoc[key] = originalDoc[key]
    }
  })
  return finalDoc
}
