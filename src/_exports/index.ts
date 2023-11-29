'use client'

import definePhraseOptions from '../definePhraseOptions'
import injectPhraseIntoSchema from '../injectPhraseIntoSchema'
import phrasePlugin from '../phrasePlugin'
import { PhrasePluginOptions } from '../types'
import { NOT_PTD, draftId, isPtdId, undraftId } from '../utils'

export {
  NOT_PTD,
  definePhraseOptions,
  draftId,
  injectPhraseIntoSchema,
  isPtdId,
  phrasePlugin,
  undraftId,
}

export type { PhrasePluginOptions }
