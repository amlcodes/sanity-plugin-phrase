'use client'

import injectPhraseIntoSchema from '../injectPhraseIntoSchema'
import phrasePlugin from '../phrasePlugin'
import { PhrasePluginOptions } from '../types'
import { draftId, isPtdId, undraftId } from '../utils/ids'
import { NOT_PTD } from '../utils/constants'

export {
  NOT_PTD,
  draftId,
  injectPhraseIntoSchema,
  isPtdId,
  phrasePlugin,
  undraftId,
}

export type { PhrasePluginOptions }
