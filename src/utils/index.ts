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

// @TODO create friendlier names - requires schema
export function getTranslationName({ sourceDoc, paths }: TranslationRequest) {
  const name = `${FILENAME_PREFIX} ${sourceDoc._type} ${getTranslationKey(
    paths,
    sourceDoc._rev,
  )} ${sourceDoc._id}`
  return {
    name,
    filename: `${name}.json`,
  }
}

export function jobComesFromSanity(
  job:
    | Pick<Phrase['JobPart'], 'filename'>
    | Pick<Phrase['JobInWebhook'], 'fileName'>,
) {
  const name =
    'filename' in job
      ? job.filename
      : 'fileName' in job
      ? job.fileName
      : undefined
  return name && name.startsWith(FILENAME_PREFIX)
}

export function dedupeArray<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

export const langAdapter = {
  sanityToCrossSystem: function sanityToCrossSystemLangCodes<
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
  phraseToCrossSystem: function phraseToCrossSystemLangCodes<
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
  crossSystemToSanity: function crossSystemToSanityLangCodes<
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
  crossSystemToPhrase: function crossSystemToPhraseLangCodes<
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
