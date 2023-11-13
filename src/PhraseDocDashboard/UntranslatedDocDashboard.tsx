import { Box, Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import { i18nAdapter } from '../adapters'
import { SanityDocumentWithPhraseMetadata } from '../types'
import { PhraseLogo } from './PhraseLogo'

// @TODO: make configurable
const POSSIBLE_SOURCE_LANGUAGES = ['en']

export default function UntranslatedDocDashboard(props: {
  document: SanityDocumentWithPhraseMetadata
  openDialog: () => void
}) {
  const docLang = i18nAdapter.getDocumentLang(props.document)
  const [state, setState] = useState<
    'idle' | 'submitting' | 'error' | 'success'
  >('idle')
  const documentId = props.document._id

  if (!docLang) return null

  if (!POSSIBLE_SOURCE_LANGUAGES.includes(docLang)) {
    return <h1>Language not supported</h1>
  }

  if (state === 'success') {
    return (
      <Card paddingX={3} paddingY={4} border radius={2}>
        <Stack space={4}>
          <Flex justify="space-between" align="center" gap={3}>
            <Heading size={2}>Translation pending</Heading>
            <PhraseLogo style={{ height: '1em' }} />
          </Flex>
        </Stack>
      </Card>
    )
  }

  const dialogId = `phrase-translation-dialog--${documentId}`

  return (
    <Card paddingX={3} paddingY={4} border radius={2}>
      <Stack space={4}>
        <Flex justify="space-between" align="center" gap={3}>
          <Heading size={2}>Untranslated document</Heading>
          <PhraseLogo style={{ height: '1em' }} />
        </Flex>
        {state === 'error' && (
          <Card tone="critical" padding={3} border radius={2}>
            <Text>Something went wrong, please try again</Text>
          </Card>
        )}
        <Box>
          <Button
            text="Translate with Phrase"
            tone="primary"
            disabled={state === 'loading'}
            onClick={props.openDialog}
            aria-haspopup="dialog"
            aria-controls={dialogId}
          />
        </Box>
      </Stack>
    </Card>
  )
}
