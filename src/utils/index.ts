import {
  SanityDocument,
  SchemaTypeDefinition,
  createSchema,
  prepareForPreview,
} from 'sanity'
import { FILENAME_PREFIX } from './constants'
import {
  CrossSystemLangCode,
  Phrase,
  PhraseLangCode,
  SanityLangCode,
  TranslationRequest,
} from '../types'
import { getTranslationKey } from './ids'
import { i18nAdapter } from '../adapters'
export * from './ids'
export * from './paths'
export * from './constants'
export * from './phrase'

export const NOT_PTD = `phraseMeta._type != "phrase.ptd.meta"`

export function getSchema(schemaTypes: SchemaTypeDefinition[]) {
  return createSchema({
    name: 'phrase',
    types: schemaTypes,
  })
}

export function getTranslationName(
  {
    sourceDoc,
    paths,
    schemaTypes,
    targetLangs,
  }: Pick<
    TranslationRequest,
    'sourceDoc' | 'paths' | 'schemaTypes' | 'targetLangs'
  >,
  freshSourceDoc: SanityDocument,
) {
  const schemaType = getSchema(schemaTypes).get(sourceDoc._type)
  const previewTitle =
    (schemaType && prepareForPreview(freshSourceDoc, schemaType)?.title) || null

  const type = schemaType?.title || sourceDoc._type
  const title = previewTitle || `id#${sourceDoc._id.slice(0, 5)}...`
  const name = `${FILENAME_PREFIX} ${type}: ${title} (${getReadableLanguageName(
    sourceDoc.lang.sanity,
  )} to ${targetLangs
    .map((l) => getReadableLanguageName(l.sanity))
    .join(', ')}) :: ${getTranslationKey(paths, sourceDoc._rev)})`
  return {
    translationName: name,
    translationFilename: `${name}.json`,
  }
}

export function jobComesFromSanity(
  job:
    | Pick<Phrase['JobPart'], 'filename'>
    | Pick<Phrase['JobInWebhook'], 'fileName'>,
) {
  const name = (() => {
    if ('filename' in job) return job.filename

    if ('fileName' in job) return job.fileName

    return undefined
  })()

  return name && name.startsWith(FILENAME_PREFIX)
}

export function dedupeArray<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

export const langAdapter = {
  sanityToCrossSystem: function sanityToCrossSystem<
    V extends SanityLangCode | SanityLangCode[],
  >(value: V) {
    if (Array.isArray(value)) {
      return value.map((v) => ({
        sanity: v,
        phrase: i18nAdapter.langAdapter.toPhrase(v),
      })) as V extends Array<any> ? CrossSystemLangCode[] : CrossSystemLangCode
    }

    return {
      sanity: value,
      phrase: i18nAdapter.langAdapter.toPhrase(value),
    } as V extends Array<any> ? CrossSystemLangCode[] : CrossSystemLangCode
  },
  phraseToCrossSystem: function phraseToCrossSystem<
    V extends PhraseLangCode | PhraseLangCode[],
  >(value: V) {
    if (Array.isArray(value)) {
      return value.map((v) => ({
        phrase: v,
        sanity: i18nAdapter.langAdapter.toSanity(v),
      })) as V extends Array<any> ? CrossSystemLangCode[] : CrossSystemLangCode
    }

    return {
      phrase: value,
      sanity: i18nAdapter.langAdapter.toSanity(value),
    } as V extends Array<any> ? CrossSystemLangCode[] : CrossSystemLangCode
  },
  crossSystemToSanity: function crossSystemToSanity<
    V extends CrossSystemLangCode | CrossSystemLangCode[],
  >(value: V) {
    if (Array.isArray(value)) {
      return value.map((v) => v.sanity) as V extends Array<any>
        ? SanityLangCode[]
        : SanityLangCode
    }

    return value.sanity as V extends Array<any>
      ? SanityLangCode[]
      : SanityLangCode
  },
  crossSystemToPhrase: function crossSystemToPhrase<
    V extends CrossSystemLangCode | CrossSystemLangCode[],
  >(value: V) {
    if (Array.isArray(value)) {
      return value.map((v) => v.phrase) as V extends Array<any>
        ? PhraseLangCode[]
        : PhraseLangCode
    }

    return value.phrase as V extends Array<any>
      ? PhraseLangCode[]
      : PhraseLangCode
  },
}

const displayNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function getReadableLanguageName(lang: string) {
  try {
    return displayNames.of(lang) || lang
  } catch (error) {
    return lang
  }
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
