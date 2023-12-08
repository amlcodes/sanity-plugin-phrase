import { SanityDocument, SchemaType, prepareForPreview } from 'sanity'
import { CreateTranslationsInput, TranslationDiff } from '../types'
import { dedupeArray } from './arrays'
import { FILENAME_PREFIX, ROOT_PATH_STR } from './constants'
import { getTranslationKey } from './ids'
import { getReadableLanguageName } from './langs'
import { formatInputDiffs } from './paths'
import { truncate } from './strings'

export function getFieldLabel(
  rootPath: string,
  fullDiffsInRoot: TranslationDiff[],
  schemaType: SchemaType,
) {
  if (rootPath === ROOT_PATH_STR) {
    return 'Entire document'
  }

  const fields =
    'fields' in schemaType && Array.isArray(schemaType.fields)
      ? schemaType.fields
      : []
  const field = fields.find((f) => f.name === rootPath)

  if (!field) {
    return `Unknown field: ${rootPath}`
  }

  const rootFieldTitle = truncate(field.type.title || rootPath, 30)
  const count = fullDiffsInRoot.length

  if (field.type.jsonType === 'array') {
    let subLabel = `${count} item${count > 1 ? 's' : ''}`

    if (fullDiffsInRoot.every(({ path }) => typeof path[1] === 'number')) {
      subLabel = `item${count > 1 ? 's' : ''} ${fullDiffsInRoot
        .map(({ path: p }) => `#${(p[1] as number) + 1}`)
        .join(', ')}`
    }

    return `${rootFieldTitle} (${subLabel})`
  }

  if (count === 1 || field.type.name === 'slug') {
    return rootFieldTitle
  }

  const subFields = dedupeArray(
    fullDiffsInRoot.map(({ path }) => {
      const subfield =
        ('fields' in field.type &&
          field.type.fields.find((f) => f.name === path[1])) ||
        undefined

      return subfield?.type?.title || path[1]
    }),
  ).join(', ')
  return `${rootFieldTitle} (${subFields})`
}

export function getTranslationName({
  sourceDoc,
  diffs: inputDiffs,
  targetLangs,
  freshDoc,
  schemaType,
}: {
  sourceDoc: CreateTranslationsInput['sourceDoc']
  diffs: CreateTranslationsInput['diffs']
  targetLangs: CreateTranslationsInput['targetLangs']
  freshDoc: SanityDocument
  schemaType?: SchemaType
}) {
  const diffs = formatInputDiffs(inputDiffs)
  const previewTitle =
    (schemaType && prepareForPreview(freshDoc, schemaType)?.title) || null

  const type = schemaType?.title || sourceDoc._type
  const title = previewTitle || `id#${sourceDoc._id.slice(0, 5)}...`
  const name = `${FILENAME_PREFIX} ${type}: ${title} (${getReadableLanguageName(
    sourceDoc.lang,
  )} to ${targetLangs
    .map((l) => getReadableLanguageName(l))
    .join(', ')}) :: ${getTranslationKey({
    diffs,
    _rev: sourceDoc._rev,
    _id: sourceDoc._id,
  })}`

  return name
}
