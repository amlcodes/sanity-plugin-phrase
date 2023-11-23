import { EyeOpenIcon } from '@sanity/icons'
import { Badge, Button, Flex, Spinner, Stack, Text } from '@sanity/ui'
import { useSchema } from 'sanity'
import { CrossSystemLangCode, SanityTMD, TranslationRequest } from '~/types'
import {
  getJobEditorURL,
  getReadableLanguageName,
  jobsMetadataExtractor,
} from '~/utils'
import { PhraseMonogram } from './PhraseLogo'
import { useOpenInSidePane } from './useOpenInSidepane'

export function TranslationInfo({
  targetLang,
  sourceDoc,
  paneParentDocId,
  TMD,
}: {
  targetLang: CrossSystemLangCode
  sourceDoc: TranslationRequest['sourceDoc']
  paneParentDocId: string
  TMD: SanityTMD | 'loading'
}) {
  const schema = useSchema()
  const schemaType = schema.get(sourceDoc._type)
  const openInSidePane = useOpenInSidePane(paneParentDocId)
  const label = getReadableLanguageName(targetLang.sanity)

  const target =
    typeof TMD === 'object' &&
    TMD.targets.find((t) => t.lang.sanity === targetLang.sanity)
  const ptdId = target && target?.ptd?._ref
  const jobsMeta =
    target && target?.jobs ? jobsMetadataExtractor(target.jobs) : undefined

  return (
    <Flex align="flex-start">
      <Stack space={3} style={{ flex: 1 }} paddingTop={3} paddingBottom={2}>
        <Text size={2} weight="semibold">
          {label}
        </Text>
        {TMD === 'loading' && <Spinner />}

        {jobsMeta && (
          <>
            <Text size={1} muted>
              Step: {jobsMeta.stepName} <Badge>{jobsMeta.stepStatus}</Badge>
            </Text>
            {jobsMeta.due && (
              <Text size={1} muted>
                Due: {jobsMeta.due}
              </Text>
            )}
          </>
        )}
      </Stack>
      {jobsMeta?.activeJobUid && (
        <Button
          icon={PhraseMonogram}
          mode="bleed"
          as="a"
          href={getJobEditorURL(
            jobsMeta.activeJobUid,
            // @TODO: make configurable
            'us',
          )}
          target="_blank"
          rel="noopener noreferrer"
          label="Edit in Phrase"
        />
      )}
      {schemaType && ptdId && (
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
