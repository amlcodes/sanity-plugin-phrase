import { EyeOpenIcon } from '@sanity/icons'
import { Path } from '@sanity/types'
import { Badge, Button, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useSchema } from 'sanity'
import {
  CrossSystemLangCode,
  PtdPhraseMetadata,
  TranslationRequest,
} from '../types'
import {
  getJobEditorURL,
  getPtdId,
  getReadableLanguageName,
  ptdMetadataExtractor,
} from '../utils'
import { PhraseMonogram } from './PhraseLogo'
import { useOpenInSidePane } from './useOpenInSidepane'

export function TranslationInfo({
  targetLang,
  paths,
  sourceDoc,
  ptdMetadata,
  paneParentDocId,
}: {
  targetLang: CrossSystemLangCode
  paths: TranslationRequest['paths']
  sourceDoc: TranslationRequest['sourceDoc']
  paneParentDocId: string
  ptdMetadata: 'loading' | PtdPhraseMetadata | undefined
}) {
  const schema = useSchema()
  const schemaType = schema.get(sourceDoc._type)
  const ptdId = getPtdId({
    targetLang,
    paths,
    sourceDoc,
  })
  const openInSidePane = useOpenInSidePane(paneParentDocId)
  const label = getReadableLanguageName(targetLang.sanity)
  const meta =
    typeof ptdMetadata === 'object' && !!ptdMetadata && ptdMetadata?.jobs
      ? ptdMetadataExtractor(ptdMetadata)
      : undefined

  return (
    <Flex align="flex-start">
      <Stack space={3} style={{ flex: 1 }} paddingTop={3} paddingBottom={2}>
        <Text size={2} weight="semibold">
          {label}
        </Text>
        {ptdMetadata === 'loading' && <Spinner />}
        {meta && (
          <>
            <Text size={1} muted>
              Step: {meta.stepName} <Badge>{meta.stepStatus}</Badge>
            </Text>
            {meta.due && (
              <Text size={1} muted>
                Due: {meta.due}
              </Text>
            )}
          </>
        )}
      </Stack>
      {meta?.activeJobUid && (
        <Button
          icon={PhraseMonogram}
          mode="bleed"
          as="a"
          href={getJobEditorURL(
            meta.activeJobUid,
            // @TODO: make configurable
            'us',
          )}
          target="_blank"
          rel="noopener noreferrer"
          label="Edit in Phrase"
        />
      )}
      {schemaType && (
        <Button
          icon={EyeOpenIcon}
          label="Preview"
          mode="bleed"
          as="a"
          href={openInSidePane.getHref(ptdId, schemaType.name)}
          onClick={(e) => {
            e.preventDefault()
            openInSidePane.openImperatively(ptdId, schemaType.name)
          }}
        />
      )}
    </Flex>
  )
}
