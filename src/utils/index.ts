import { SanityDocument, SchemaType, prepareForPreview } from 'sanity'
import {
  CreateTranslationsInput,
  METADATA_KEY,
  Phrase,
  SanityDocumentWithPhraseMetadata,
} from '../types'
import { FILENAME_PREFIX } from './constants'
import { getTranslationKey } from './ids'
import { getReadableLanguageName } from './langs'
import { formatInputPaths } from './paths'
export * from './constants'
export * from './fieldLabels'
export * from './ids'
export * from './langs'
export * from './paths'
export * from './phrase'

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const NOT_PTD = `${METADATA_KEY}._type != "phrase.ptd.meta"`

export function getTranslationName({
  sourceDoc,
  paths: inputPaths,
  targetLangs,
  freshDoc,
  schemaType,
}: {
  sourceDoc: CreateTranslationsInput['sourceDoc']
  paths: CreateTranslationsInput['paths']
  targetLangs: CreateTranslationsInput['targetLangs']
  freshDoc: SanityDocument
  schemaType?: SchemaType
}) {
  const paths = formatInputPaths(inputPaths)
  const previewTitle =
    (schemaType && prepareForPreview(freshDoc, schemaType)?.title) || null

  const type = schemaType?.title || sourceDoc._type
  const title = previewTitle || `id#${sourceDoc._id.slice(0, 5)}...`
  const name = `${FILENAME_PREFIX} ${type}: ${title} (${getReadableLanguageName(
    sourceDoc.lang,
  )} to ${targetLangs
    .map((l) => getReadableLanguageName(l))
    .join(', ')}) :: ${getTranslationKey(paths, sourceDoc._rev)})`

  return name
}

export function comesFromSanity(
  entity:
    | Pick<Phrase['JobPart'], 'filename'>
    | Pick<Phrase['JobInWebhook'], 'fileName'>
    | Pick<Phrase['CreatedProject'], 'name'>,
) {
  const name = (() => {
    if ('filename' in entity) return entity.filename

    if ('fileName' in entity) return entity.fileName

    if ('name' in entity) return entity.name

    return undefined
  })()

  return name && name.startsWith(FILENAME_PREFIX)
}

export function dedupeArray<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

export const ONE_HOUR = 1000 * 60 * 60
export const ONE_DAY = ONE_HOUR * 24

export function getDateDaysFromNow(dayCount: number) {
  return new Date(new Date().valueOf() + ONE_DAY * dayCount)
}

export function getIsoDay(date: Date) {
  return date.toISOString().split('T')[0]
}

export function formatDay(date: Date, lang?: string) {
  try {
    return date.toLocaleDateString(lang, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch (error) {
    return date.toLocaleDateString('en', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
}

export function getTranslationSnapshot(doc: SanityDocumentWithPhraseMetadata) {
  return {
    ...doc,
    [METADATA_KEY]: undefined,
  }
}

/**
 * Limits a string to a certain length for UI or SEO purposes.
 *
 * Dive further: https://hdoro.dev/javascript-truncation
 */
export function truncate(str: string, maxLength: number) {
  if (str.length < maxLength) {
    return str
  }

  // To prevent truncating in the middle of words, let's get
  // the position of the first whitespace after the truncation
  const firstWhitespaceAfterTruncation =
    str.slice(maxLength).search(/\s/) + maxLength

  return `${str.slice(0, firstWhitespaceAfterTruncation)}...`
}
