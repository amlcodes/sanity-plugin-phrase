import { Path, SanityDocument } from '@sanity/types'
import { get, numEqualSegments, toString } from '@sanity/util/paths'
import { TranslationRequest } from './types'
import { Mutation, arrayToJSONMatchPath } from '@sanity/mutator'

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

  /**
   * @TODO how to deal with edition of nested content when sourceDoc doesn't have parent paths?
   * Ex: sourceDoc has no `slug`, and `path` is `['slug', 'current']`. Currently, we just ignore it.
   * Should we copy the whole parent from `targetDoc` up until it exists in the sourceDoc's path?
   */
  const mutation = new Mutation({
    mutations: [
      {
        patch: {
          id: originalDoc._id,
          set: {
            [arrayToJSONMatchPath(path)]: get(changedDoc, path),
          },
        },
      },
    ],
  })

  return keepOriginalId(
    originalDoc,
    Mutation.applyAll(originalDoc, [mutation]) as SanityDocument,
  )
}
