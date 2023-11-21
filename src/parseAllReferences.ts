import { Reference } from 'sanity'

const UNDESIRED_KEYS = ['phraseMetadata']

/**
 * Can contain duplicates.
 * Ignores images.
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
      // Ignore images
      if (
        !('_ref' in data) ||
        typeof data._ref !== 'string' ||
        data._ref.startsWith('image-')
      )
        return state

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
