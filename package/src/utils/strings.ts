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

const formatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
})

export function semanticListItems(items: string[]) {
  return formatter.format(items)
}
