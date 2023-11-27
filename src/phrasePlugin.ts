import { Plugin } from 'sanity'
import { PhraseMonogram } from './components/PhraseDocDashboard/PhraseLogo'
import createPhraseTool from './components/PhraseTool/PhraseTool'
import injectPhraseIntoSchema from './injectPhraseIntoSchema'
import { PhrasePluginOptions } from './types'

const phrasePlugin: Plugin<PhrasePluginOptions> = (pluginOptions) => {
  return {
    name: 'sanity-plugin-phrase',
    document: {
      // @TODO: badges
      // @TODO: solution to remove unstable_languageFilter for PTDs
    },
    schema: {
      types: (prev) => injectPhraseIntoSchema(prev, pluginOptions),
    },
    tools: [
      {
        name: 'phrase',
        title: 'Phrase',
        icon: PhraseMonogram,
        component: createPhraseTool(pluginOptions),
      },
    ],
  }
}

export default phrasePlugin
