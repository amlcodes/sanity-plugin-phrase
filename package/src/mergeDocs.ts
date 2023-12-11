import { SanityDocument } from 'sanity'
import { TranslationDiff } from './types'
import { STATIC_DOC_KEYS, applyDiffs } from './utils'

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

export function keepStaticValues<D extends SanityDocument>(
  originalDoc: D,
  changedDoc: D,
): D {
  const finalDoc = { ...changedDoc }
  STATIC_DOC_KEYS.forEach((key) => {
    if (key in originalDoc) {
      // @ts-expect-error
      finalDoc[key] = originalDoc[key]
    }
  })
  return finalDoc
}
