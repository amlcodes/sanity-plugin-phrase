'use client'

import { DuplicateTranslatedDocumentAction } from '../components/DuplicateTranslatedDocumentAction'
import injectPhraseIntoSchema from '../injectPhraseIntoSchema'
import phrasePlugin from '../phrasePlugin'
import { PhrasePluginOptions } from '../types'
import { NOT_PTD } from '../utils/constants'
import { draftId, isPtdId, undraftId } from '../utils/ids'

export {
  DuplicateTranslatedDocumentAction,
  NOT_PTD,
  draftId,
  injectPhraseIntoSchema,
  isPtdId,
  phrasePlugin,
  undraftId,
}

export type { PhrasePluginOptions }
