// Adapted from: https://github.com/sanity-io/sanity/blob/main/packages/sanity/src/core/form/inputs/ReferenceInput/ReferencePreview.tsx

import { EditIcon, PublishIcon } from '@sanity/icons'
import { Box, Flex, Inline, Text, Tooltip, useRootTheme } from '@sanity/ui'
import {
  DocumentPreviewPresence,
  Preview,
  PreviewCard,
  Reference,
  SchemaType,
  TextWithTone,
  useDocumentPresence,
  useEditState,
} from 'sanity'
import { TimeAgo } from './TimeAgo'
import { undraftId } from '~/utils'
import { useOpenInSidePane } from '../PhraseDocDashboard/useOpenInSidepane'

/**
 * Used to preview a referenced type
 * Takes the reference type as props
 */
export function ReferencePreview(props: {
  reference: Reference
  schemaType: SchemaType
  parentDocId: string
  referenceOpen: boolean
}) {
  const { schemaType } = props
  const refId = undraftId(props.reference._ref) as string
  const openInSidePane = useOpenInSidePane(props.parentDocId)
  const editState = useEditState(refId, schemaType.name)

  const theme = useRootTheme()
  const documentPresence = useDocumentPresence(refId)

  const previewId = editState.draft?._id || editState.published?._id || refId

  return (
    <PreviewCard
      href={openInSidePane.getHref(refId, schemaType.name)}
      onClick={(e) => {
        e.preventDefault()
        openInSidePane.openImperatively(refId, schemaType.name)
      }}
      as="a"
      paddingY={2}
      paddingX={3}
      radius={2}
      style={{ cursor: 'pointer' }}
      tone={'inherit'}
    >
      <Flex align="center">
        <Box flex={1}>
          <Preview
            schemaType={schemaType}
            value={{ ...props.reference, _ref: previewId } as Reference}
          />
        </Box>

        <Box paddingLeft={3}>
          <Inline space={3}>
            {documentPresence && documentPresence.length > 0 && (
              <DocumentPreviewPresence presence={documentPresence} />
            )}

            <Inline space={4}>
              <Box>
                <Tooltip
                  portal
                  content={
                    <Box padding={2}>
                      <Text size={1}>
                        {editState.published?._updatedAt ? (
                          <>
                            Published{' '}
                            <TimeAgo time={editState.published._updatedAt} />
                          </>
                        ) : (
                          <>Not published</>
                        )}
                      </Text>
                    </Box>
                  }
                >
                  <TextWithTone
                    tone={theme.tone === 'default' ? 'positive' : 'default'}
                    size={1}
                    dimmed={!editState.published}
                    muted={!editState.published}
                  >
                    <PublishIcon />
                  </TextWithTone>
                </Tooltip>
              </Box>

              <Box>
                <Tooltip
                  portal
                  content={
                    <Box padding={2}>
                      <Text size={1}>
                        {editState.draft?._updatedAt ? (
                          <>
                            Edited <TimeAgo time={editState.draft._updatedAt} />
                          </>
                        ) : (
                          <>No unpublished edits</>
                        )}
                      </Text>
                    </Box>
                  }
                >
                  <TextWithTone
                    tone={theme.tone === 'default' ? 'caution' : 'default'}
                    size={1}
                    dimmed={!editState.draft}
                    muted={!editState.draft}
                  >
                    <EditIcon />
                  </TextWithTone>
                </Tooltip>
              </Box>
            </Inline>
          </Inline>
        </Box>
      </Flex>
    </PreviewCard>
  )
}
