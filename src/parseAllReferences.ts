import { Reference } from '@sanity/types'

const UNDESIRED_KEYS = ['phraseMeta']

/**
 * Can contain duplicates.
 */
export function parseAllReferences(
  data: unknown,
  state: Reference[],
): Reference[] {
  if (Array.isArray(data)) {
    return [...state, ...data.flatMap((a) => parseAllReferences(a, state))]
  }

  if (typeof data === 'object' && data !== null) {
    if ('_type' in data && data._type === 'reference') {
      return [...state, data as Reference]
    }

    return [
      ...state,
      ...Object.entries(data).flatMap(([key, propertyValue]) => {
        if (UNDESIRED_KEYS.includes(key)) return []

        return parseAllReferences(propertyValue, state)
      }),
    ]
  }

  return state
}
