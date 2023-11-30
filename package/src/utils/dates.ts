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

/**
 * We don't want users to set the time due, but Phrase requires a datetime.
 * @example
 * prepareDateForPhrase('2021-01-01') // '2021-01-01T23:59:59Z'
 */
export function prepareDateForPhrase(dateStr?: string) {
  if (!dateStr) return undefined

  if (dateStr.includes('T')) return dateStr

  return `${dateStr}T23:59:59Z`
}
