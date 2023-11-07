import { Path } from '@sanity/types'
import { describe, expect, test } from 'bun:test'
import ensureDocNotLocked from '../src/ensureDocNotLocked'
import example from '../example-data/ensureDocNotLocked.json'
import { SanityTranslationDocPair } from '../src/types'

const exampleFreshDocuments = example as (SanityTranslationDocPair & {
  unlocked?: { paths: Path[]; label: string }[]
  locked?: { paths: Path[]; label: string }[]
})[]

describe('ensureDocNotLocked', () => {
  exampleFreshDocuments.forEach(
    ({ unlocked = [], locked = [], ...freshDocument }, docIndex) => {
      unlocked.forEach(({ paths, label }) => {
        test(`${label} (UNLOCKED - doc #${docIndex + 1})`, () => {
          expect(() =>
            ensureDocNotLocked({ paths, freshDocuments: [freshDocument] }),
          ).not.toThrow()
        })
      })
      locked.forEach(({ paths, label }) => {
        test(`${label} (LOCKED - doc #${docIndex + 1})`, () => {
          expect(() =>
            ensureDocNotLocked({ paths, freshDocuments: [freshDocument] }),
          ).toThrow()
        })
      })
    },
  )
})
