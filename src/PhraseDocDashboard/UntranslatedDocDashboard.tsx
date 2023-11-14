import { Box, Button, Card, Flex, Heading, Stack } from '@sanity/ui'
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
  const documentId = props.document._id

  if (!docLang) return null

  if (!POSSIBLE_SOURCE_LANGUAGES.includes(docLang)) {
    return <h1>Language not supported</h1>
  }

  const dialogId = `phrase-translation-dialog--${documentId}`

  return (
    <Card paddingX={3} paddingY={4} border radius={2}>
      <Stack space={4}>
        <Flex justify="space-between" align="center" gap={3}>
          <Heading size={2}>Untranslated document</Heading>
          <PhraseLogo style={{ height: '1em' }} />
        </Flex>
        <Box>
          <Button
            text="Translate with Phrase"
            tone="primary"
            // disabled={state === 'loading'}
            onClick={props.openDialog}
            aria-haspopup="dialog"
            aria-controls={dialogId}
          />
        </Box>
      </Stack>
    </Card>
  )
}
