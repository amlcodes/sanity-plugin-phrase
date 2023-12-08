import { describe, expect, test } from 'bun:test'
import example from '../example-data/isDocLocked.json'
import isDocLocked from '../src/createTranslation/isDocLocked'
import { SanityTranslationDocPair, TranslationRequest } from '../src/types'

const exampleFreshDocuments =
  example as unknown as (SanityTranslationDocPair & {
    targetLangs: TranslationRequest['targetLangs']
    unlocked?: { diffs: TranslationRequest['diffs']; label: string }[]
    locked?: { diffs: TranslationRequest['diffs']; label: string }[]
  })[]

describe('ensureDocNotLocked', () => {
  exampleFreshDocuments.forEach(
    (
      { unlocked = [], locked = [], targetLangs, ...freshDocument },
      docIndex,
    ) => {
      unlocked.forEach(({ diffs, label }) => {
        test(`${label} (UNLOCKED - doc #${docIndex + 1})`, () => {
          expect(
            isDocLocked({
              request: { diffs, targetLangs },
              freshDocuments: [freshDocument],
            }),
          ).toEqual(false)
        })
      })
      locked.forEach(({ diffs, label }) => {
        test(`${label} (LOCKED - doc #${docIndex + 1})`, () => {
          expect(
            isDocLocked({
              request: { diffs, targetLangs },
              freshDocuments: [freshDocument],
            }),
          ).toEqual(true)
        })
      })
    },
  )
})
