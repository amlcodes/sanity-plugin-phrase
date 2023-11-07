import { describe, expect, test } from 'bun:test'
// import { describe, expect, test } from 'vitest'
import phraseToSanity from '../src/phraseToSanity'
import sanityToPhrase from '../src/sanityToPhrase'
import { exampleDocuments } from './exampleDocuments'

describe('Sanity -> Phrase -> Sanity: should be equal', () => {
  exampleDocuments.forEach(({ filename, document }) => {
    test(filename, () => {
      expect(document).toStrictEqual(phraseToSanity(sanityToPhrase(document)))
    })
  })
})
