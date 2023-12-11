'use client'

import { Text } from '@sanity/ui'
import { useSchema } from 'sanity'
import { getFieldLabel, joinDiffsByRoot } from '../utils'
import { SanityTMD } from '../types'

export function TranslationPathsDisplay(
  props: Pick<SanityTMD, 'sourceDoc' | 'diffs'>,
) {
  const schema = useSchema()
  const sourceSchemaType = schema.get(props.sourceDoc._type)

  if (!sourceSchemaType) return null

  return (
    <>
      {Object.entries(joinDiffsByRoot(props.diffs)).map(
        ([rootPath, fullPathsInRoot]) => (
          <Text key={rootPath} size={1} muted>
            {getFieldLabel(rootPath, fullPathsInRoot, sourceSchemaType)}
          </Text>
        ),
      )}
    </>
  )
}
