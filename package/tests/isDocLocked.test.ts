import { describe, expect, test } from 'bun:test'
import example from '../example-data/isDocLocked.json'
import isDocLocked from '../src/createTranslation/isDocLocked'
import { SanityTranslationDocPair, TranslationRequest } from '../src/types'

const exampleFreshDocuments =
  example as unknown as (SanityTranslationDocPair & {
    targetLangs: TranslationRequest['targetLangs']
    unlocked?: { paths: TranslationRequest['paths']; label: string }[]
    locked?: { paths: TranslationRequest['paths']; label: string }[]
  })[]

describe('ensureDocNotLocked', () => {
  exampleFreshDocuments.forEach(
    (
      { unlocked = [], locked = [], targetLangs, ...freshDocument },
      docIndex,
    ) => {
      unlocked.forEach(({ paths, label }) => {
        test(`${label} (UNLOCKED - doc #${docIndex + 1})`, () => {
          expect(
            isDocLocked({
              request: { paths, targetLangs },
              freshDocuments: [freshDocument],
            }),
          ).toEqual(false)
        })
      })
      locked.forEach(({ paths, label }) => {
        test(`${label} (LOCKED - doc #${docIndex + 1})`, () => {
          expect(
            isDocLocked({
              request: { paths, targetLangs },
              freshDocuments: [freshDocument],
            }),
          ).toEqual(true)
        })
      })
    },
  )
})
