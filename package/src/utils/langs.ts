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

export function langsAreTheSame(
  lang1: CrossSystemLangCode | SanityLangCode | PhraseLangCode,
  lang2: CrossSystemLangCode | SanityLangCode | PhraseLangCode,
) {
  const lang1Value = typeof lang1 === 'string' ? lang1 : lang1.sanity
  const lang2Value = typeof lang2 === 'string' ? lang2 : lang2.sanity

  return lang1Value === lang2Value
}

export function targetLangsIntersect(
  langs1: (CrossSystemLangCode | SanityLangCode | PhraseLangCode)[],
  langs2: (CrossSystemLangCode | SanityLangCode | PhraseLangCode)[],
) {
  return langs1.some((l1) => langs2.some((l2) => langsAreTheSame(l1, l2)))
}
