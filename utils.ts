import { Path } from '@sanity/types'
import { numEqualSegments, toString } from '@sanity/util/paths'
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
