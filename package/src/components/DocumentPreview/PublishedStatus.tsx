// Adapted from https://github.com/sanity-io/sanity/blob/next/packages/sanity/src/desk/components/PublishedStatus.tsx

import { PublishIcon } from '@sanity/icons'
import { Box, Text, Tooltip } from '@sanity/ui'
import type { PreviewValue, SanityDocument } from 'sanity'
import { TextWithTone } from 'sanity'
import { TimeAgo } from './TimeAgo'

export function PublishedStatus(props: {
  document?: PreviewValue | Partial<SanityDocument> | null
}) {
  const { document } = props
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
              <>Published {updatedAt && <TimeAgo time={updatedAt} />}</>
            ) : (
              <>Not published</>
            )}
          </Text>
        </Box>
      }
    >
      <TextWithTone
        tone="positive"
        dimmed={!props.document}
        muted={!props.document}
        size={1}
      >
        <PublishIcon />
      </TextWithTone>
    </Tooltip>
  )
}
