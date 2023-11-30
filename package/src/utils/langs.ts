import {
  SanityLangCode,
  CrossSystemLangCode,
  PhraseLangCode,
  I18nAdapter,
} from '../types'

export const createLangAdapter = (i18nAdapter: I18nAdapter) => ({
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
})

export type LangAdapter = ReturnType<typeof createLangAdapter>

const displayNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function getReadableLanguageName(lang: string) {
  try {
    return displayNames.of(lang) || lang
  } catch (error) {
    return lang
  }
}
