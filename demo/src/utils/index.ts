export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const TRANSLATABLE_SCHEMAS = ['post'] as const

export const LANGUAGES = [
  { id: 'es', title: 'Spanish' },
  { id: 'en', title: 'English' },
  { id: 'pt', title: 'Portuguese' },
] as const

export const SOURCE_LANGUAGE = 'en'

export const isSupportedLanguage = (lang: string): lang is SupportedLanguage =>
  LANGUAGES.some((l) => l.id === lang)

export type SupportedLanguage = (typeof LANGUAGES)[number]['id']

export function undraftId(id: string) {
  return id.replace('drafts.', '')
}
export function draftId(id: string) {
  return `drafts.${undraftId(id)}`
}

const displayNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function getReadableLanguageName(lang: string) {
  try {
    return displayNames.of(lang) || lang
  } catch (error) {
    return lang
  }
}
