import { Plugin } from 'sanity'
import { PhraseMonogram } from './components/PhraseDocDashboard/PhraseLogo'
import createPhraseTool from './components/PhraseTool/PhraseTool'
import injectPhraseIntoSchema from './injectPhraseIntoSchema'
import { PhrasePluginOptions } from './types'
import { createDocumentBadge } from './components/DocumentBadge'

const phrasePlugin: Plugin<PhrasePluginOptions> = (pluginOptions) => {
  return {
    name: 'sanity-plugin-phrase',
    document: {
      badges: (prev, context) => {
        if (!pluginOptions.translatableTypes.includes(context.schemaType)) {
          return prev
        }

        return [createDocumentBadge(pluginOptions)]
      },
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
