import { describe, expect, test } from 'bun:test'
import { Path } from 'sanity'
import example from '../example-data/isDocLocked.json'
import isDocLocked from '../src/createTranslation/isDocLocked'
import { SanityTranslationDocPair } from '../src/types'

const exampleFreshDocuments =
  example as unknown as (SanityTranslationDocPair & {
    unlocked?: { paths: Path[]; label: string }[]
    locked?: { paths: Path[]; label: string }[]
  })[]

describe('ensureDocNotLocked', () => {
  exampleFreshDocuments.forEach(
    ({ unlocked = [], locked = [], ...freshDocument }, docIndex) => {
      unlocked.forEach(({ paths, label }) => {
        test(`${label} (UNLOCKED - doc #${docIndex + 1})`, () => {
          expect(
            isDocLocked({
              request: { paths },
              freshDocuments: [freshDocument],
            }),
          ).toEqual(false)
        })
      })
      locked.forEach(({ paths, label }) => {
        test(`${label} (LOCKED - doc #${docIndex + 1})`, () => {
          expect(
            isDocLocked({
              request: { paths },
              freshDocuments: [freshDocument],
            }),
          ).toEqual(true)
        })
      })
    },
  )
})
