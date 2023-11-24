import { Plugin } from 'sanity'
import { PhraseMonogram } from './components/PhraseDocDashboard/PhraseLogo'
import PhraseTool from './components/PhraseTool/PhraseTool'
import injectPhraseIntoSchema from './injectPhraseIntoSchema'
import { PhrasePluginOptions } from './types'

const phrasePlugin: Plugin<PhrasePluginOptions> = (options) => {
  return {
    name: 'sanity-plugin-phrase',
    document: {
      // @TODO: badges
      // @TODO: solution to remove unstable_languageFilter for PTDs
    },
    schema: {
      types: (prev) => injectPhraseIntoSchema(prev, options),
    },
    tools: [
      {
        name: 'phrase',
        title: 'Phrase',
        icon: PhraseMonogram,
        component: PhraseTool,
      },
    ],
  }
}

export default phrasePlugin
