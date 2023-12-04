'use client'
import { Text } from '@sanity/ui'
import { useSchema } from 'sanity'
import { MainDocTranslationMetadata } from '../types'
import { getFieldLabel, joinPathsByRoot, parsePathsString } from '../utils'

export function TranslationPathsDisplay(props: {
  sourceDoc: MainDocTranslationMetadata['sourceDoc']
  paths: MainDocTranslationMetadata['paths']
}) {
  const schema = useSchema()
  const sourceSchemaType = schema.get(props.sourceDoc._type)

  if (!sourceSchemaType) return null

  return (
    <>
      {Object.entries(joinPathsByRoot(parsePathsString(props.paths))).map(
        ([rootPath, fullPathsInRoot]) => (
          <Text key={rootPath} size={1} muted>
            {getFieldLabel(rootPath, fullPathsInRoot, sourceSchemaType)}
          </Text>
        ),
      )}
    </>
  )
}
