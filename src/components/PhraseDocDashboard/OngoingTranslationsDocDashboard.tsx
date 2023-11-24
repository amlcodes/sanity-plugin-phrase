import { Button, Card, Flex, Heading, Spinner, Stack, Text } from '@sanity/ui'
import { useEditState } from 'sanity'
import {
  CreatedMainDocMetadata,
  MainDocTranslationMetadata,
  SanityTMD,
  TranslationRequest,
} from '../../types'
import {
  getPathsLabel,
  getProjectURL,
  isTranslationCommitted,
  isTranslationReadyToCommit,
} from '../../utils'
import { TranslationInfo } from './TranslationInfo'
import { usePluginOptions } from '../PluginOptionsContext'

export default function OngoingTranslationsDocDashboard(props: {
  ongoingTranslations: MainDocTranslationMetadata[]
  sourceDoc: TranslationRequest['sourceDoc']
}) {
  return (
    <Card paddingX={3} padding={4} border radius={2}>
      <Heading as="h2">This document has translations in progress</Heading>
      <Stack space={4} marginTop={4}>
        {props.ongoingTranslations.map((translation) => {
          if (isTranslationCommitted(translation)) return null

          if (translation.status === 'CREATING')
            return (
              <div key={translation._key}>
                Project being created in Phrase for{' '}
                {translation.paths.map((p) => `[${p.join(', ')}]`).join(', ')}
              </div>
            )

          if (translation.status === 'FAILED_PERSISTING') {
            return <div key={translation._key}>failed @TODO</div>
          }

          if (translation.status === 'DELETED') {
            return <div key={translation._key}>deleted @TODO</div>
          }

          return (
            <OngoingTranslationCard
              key={translation._key}
              translation={translation}
              sourceDoc={props.sourceDoc}
            />
          )
        })}
      </Stack>
    </Card>
  )
}

function OngoingTranslationCard({
  translation,
  sourceDoc,
}: {
  sourceDoc: TranslationRequest['sourceDoc']
  translation: CreatedMainDocMetadata
}) {
  const { phraseRegion } = usePluginOptions()
  const { ready, draft, published } = useEditState(
    translation.tmd._ref,
    translation.tmd._type,
  )
  const TMD = (draft || published) as SanityTMD

  if (!ready) {
    return <Spinner />
  }

  if (!TMD) {
    return <div> Error (@todo)</div>
  }

  return (
    <Card padding={3} border radius={1}>
      <Stack space={4}>
        <Flex align="center" gap={2}>
          <Heading size={1} as="h3" style={{ flex: 1 }}>
            {getPathsLabel(translation.paths)}
          </Heading>
          <Button
            size={1}
            as="a"
            href={getProjectURL(TMD.phraseProjectUid, phraseRegion)}
            target="_blank"
            rel="noopener noreferrer"
            mode="ghost"
            text="Project in Phrase"
          />
        </Flex>

        {TMD.targets.map((target) => (
          <TranslationInfo
            key={target._key}
            paneParentDocId={sourceDoc._id}
            sourceDoc={{ ...sourceDoc, _rev: translation.sourceDocRev }}
            targetLang={target.lang}
            TMD={TMD}
          />
        ))}

        {isTranslationReadyToCommit(translation) && (
          <Flex align="center" justify="space-between">
            <Text>Translation is completed</Text>
            <Button
              mode="default"
              tone="positive"
              text="Commit translation"
              onClick={() => {
                // @TODO
              }}
            />
          </Flex>
        )}
      </Stack>
    </Card>
  )
}
