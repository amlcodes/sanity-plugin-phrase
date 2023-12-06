// Adapted from https://github.com/sanity-io/sanity/blob/next/packages/sanity/src/desk/components/DraftStatus.tsx
import { EditIcon } from '@sanity/icons'
import { Box, Text, Tooltip } from '@sanity/ui'
import type { PreviewValue, SanityDocument } from 'sanity'
import { TextWithTone } from 'sanity'
import { TimeAgo } from './TimeAgo'

export function DraftStatus(props: {
  document?: PreviewValue | Partial<SanityDocument> | null
}) {
  const updatedAt =
    props.document &&
    '_updatedAt' in props.document &&
    props.document._updatedAt

  return (
    <Tooltip
      portal
      content={
        <Box padding={2}>
          <Text size={1}>
            {document ? (
              <>Edited {updatedAt && <TimeAgo time={updatedAt} />}</>
            ) : (
              <>No unpublished edits</>
            )}
          </Text>
        </Box>
      }
    >
      <TextWithTone
        tone="caution"
        dimmed={!props.document}
        muted={!props.document}
        size={1}
      >
        <EditIcon />
      </TextWithTone>
    </Tooltip>
  )
}
