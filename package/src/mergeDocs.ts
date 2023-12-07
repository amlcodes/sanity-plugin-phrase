import { SanityDocument } from 'sanity'
import { DiffPath, METADATA_KEY } from './types'
import { applyDiffPaths } from './utils'

const STATIC_KEYS = ['_id', '_rev', '_type', METADATA_KEY] as const

export function mergeDocs<D extends SanityDocument>({
  startingDocument,
  updatedDocument,
  diffPaths,
}: {
  startingDocument: D
  updatedDocument: D
  diffPaths: DiffPath[]
}): D {
  return keepStaticValues(
    startingDocument,
    applyDiffPaths({
      startingDocument,
      updatedDocument: updatedDocument,
      diffPaths,
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
