import { Path } from '@sanity/types'
import { numEqualSegments } from '@sanity/util/paths'

export default function pathsIntersect(a: Path, b: Path) {
  return JSON.stringify(a) === JSON.stringify(b) || numEqualSegments(a, b) > 0
}
