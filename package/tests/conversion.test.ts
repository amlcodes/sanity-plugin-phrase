import { describe, expect, test } from 'bun:test'
// import { describe, expect, test } from 'vitest'
import decodeFromPhrase from '../src/decodeFromPhrase'
import encodeToPhrase from '../src/encodeToPhrase'
import { exampleDocuments } from './exampleDocuments'

describe('Sanity -> Phrase -> Sanity: should be equal', () => {
  exampleDocuments.forEach(({ filename, document }) => {
    test(filename, () => {
      expect(document).toStrictEqual(decodeFromPhrase(encodeToPhrase(document)))
    })
  })
})
