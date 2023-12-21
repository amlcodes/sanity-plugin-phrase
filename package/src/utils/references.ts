import { Reference } from 'sanity'
import { METADATA_KEY, ReferenceMap } from '../types'

const UNDESIRED_KEYS = [METADATA_KEY]

function isValidRef(data: object): data is Reference {
  return (
    '_ref' in data &&
    typeof data._ref === 'string' &&
    // Ignore images & files
    !data._ref.startsWith('image-') &&
    !data._ref.startsWith('file-') &&
    // Ignore Sanity internals
    !data._ref.startsWith('_.')
  )
}

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
    if (isValidRef(data)) {
      return [...state, data]
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

function replaceTranslatedReference(
  reference: Reference,
  referenceMap: ReferenceMap,
): Reference {
  const inMap = referenceMap[reference._ref]
  if (typeof inMap === 'object' && inMap.targetLanguageDocId) {
    const final = {
      ...reference,
      _ref: inMap.targetLanguageDocId,
      _weak: inMap.state === 'draft' ? true : reference._weak,
      _strengthenOnPublish:
        inMap.state === 'draft'
          ? {
              type: inMap._type,
            }
          : reference._strengthenOnPublish,
    }

    return final
  }

  return reference
}

export function injectTranslatedReferences({
  data,
  referenceMap,
}: {
  data: unknown
  referenceMap: ReferenceMap
}): typeof data {
  if (Array.isArray(data)) {
    return data.map((item) =>
      injectTranslatedReferences({ data: item, referenceMap }),
    )
  }

  if (typeof data === 'object' && data !== null) {
    if (isValidRef(data)) {
      return replaceTranslatedReference(data, referenceMap)
    }

    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        injectTranslatedReferences({ data: value, referenceMap }),
      ]),
    )
  }

  return data
}
