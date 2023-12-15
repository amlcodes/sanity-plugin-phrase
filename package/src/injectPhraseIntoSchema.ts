import { SchemaTypeDefinition, defineField, defineType } from 'sanity'
import getPhraseDocDashboard from './components/PhraseDocDashboard/PhraseDocDashboard'
import { PhrasePluginOptions } from './types'
import { isPtdId } from './utils'

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

  return defineType({
    ...schemaType,
    readOnly: (context) => {
      if (context.document?._id && isPtdId(context.document._id)) {
        return true
      }

      if (typeof schemaType.readOnly === 'function') {
        return schemaType.readOnly(context)
      }

      if (typeof schemaType.readOnly === 'boolean') {
        return schemaType.readOnly
      }

      return false
    },
    fields: [
      defineField({
        name: 'phraseMetadata',
        title: 'here',
        type: 'object',
        components: {
          // @ts-expect-error
          field: getPhraseDocDashboard(pluginOptions),
        },
        readOnly: true,
        hidden: pluginOptions.isPhraseDashboardHidden,
        fields: [
          {
            name: 'fakefield',
            type: 'string',
          },
        ],
      }),
      ...schemaType.fields,
    ],
  })
}
