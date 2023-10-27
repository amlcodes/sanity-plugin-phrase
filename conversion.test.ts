import fs from 'fs'
import { describe, expect, test } from 'bun:test'
// import { describe, expect, test } from 'vitest'
import phraseToSanity from './phraseToSanity'
import sanityToPhrase from './sanityToPhrase'

const exampleDocuments = fs
  .readdirSync('./example-data/sanity-documents')
  .map((filename) => ({
    filename,
    document: JSON.parse(
      fs.readFileSync(`./example-data/sanity-documents/${filename}`, 'utf-8'),
    ),
  }))

describe('Sanity -> Phrase -> Sanity: should be equal', () => {
  exampleDocuments.map(({ filename, document }) => {
    test(filename, () => {
      expect(document).toStrictEqual(phraseToSanity(sanityToPhrase(document)))
    })
  })
})
