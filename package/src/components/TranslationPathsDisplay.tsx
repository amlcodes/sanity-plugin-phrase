'use client'
import { Text } from '@sanity/ui'
import { useSchema } from 'sanity'
import { MainDocTranslationMetadata } from '../types'
import { getFieldLabel, joinDiffsByRoot, parseStringifiedDiffs } from '../utils'

export function TranslationPathsDisplay(props: {
  sourceDoc: MainDocTranslationMetadata['sourceDoc']
  diffs: MainDocTranslationMetadata['diffs']
}) {
  const schema = useSchema()
  const sourceSchemaType = schema.get(props.sourceDoc._type)

  if (!sourceSchemaType) return null

  return (
    <>
      {Object.entries(joinDiffsByRoot(parseStringifiedDiffs(props.diffs))).map(
        ([rootPath, fullPathsInRoot]) => (
          <Text key={rootPath} size={1} muted>
            {getFieldLabel(rootPath, fullPathsInRoot, sourceSchemaType)}
          </Text>
        ),
      )}
    </>
  )
}
