import { SchemaTypeDefinition } from 'sanity'
import getPhraseDocDashboard from './components/PhraseDocDashboard/PhraseDocDashboard'
import { PhrasePluginOptions } from './types'

export default function injectPhraseIntoSchema(
  types: SchemaTypeDefinition[],
  pluginOptions: PhrasePluginOptions,
) {
  return types.map((type) => injectSchema(type, pluginOptions))
}

function injectSchema(
  schemaType: SchemaTypeDefinition,
  pluginOptions: PhrasePluginOptions,
) {
  if (
    !pluginOptions.translatableTypes.includes(schemaType.name) ||
    !('fields' in schemaType) ||
    !Array.isArray(schemaType.fields)
  ) {
    return schemaType
  }

  return {
    ...schemaType,
    fields: [
      {
        name: 'phraseMetadata',
        title: 'here',
        type: 'object',
        components: {
          field: getPhraseDocDashboard(pluginOptions),
        },
        readOnly: true,
        fields: [
          {
            name: 'fakefield',
            type: 'string',
          },
        ],
      },
      ...schemaType.fields,
    ],
  }
}
