import { SanityDocument } from 'sanity'
import { TranslationDiff, METADATA_KEY } from './types'
import { applyDiffs } from './utils'

const STATIC_KEYS = ['_id', '_rev', '_type', METADATA_KEY] as const

export function mergeDocs<D extends SanityDocument>({
  startingDocument,
  updatedDocument,
  diffs,
}: {
  startingDocument: D
  updatedDocument: D
  diffs: TranslationDiff[]
}): D {
  return keepStaticValues(
    startingDocument,
    applyDiffs({
      startingDocument,
      updatedDocument,
      diffs,
    }) as D,
  )
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
