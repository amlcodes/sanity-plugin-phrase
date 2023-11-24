import {
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@sanity/ui'
import React from 'react'
import { useClient, useEditState } from 'sanity'
import commitTranslation from '../../commitTranslation'
import {
  CreatedMainDocMetadata,
  MainDocTranslationMetadata,
  SanityTMD,
  TranslationRequest,
} from '../../types'
import {
  SANITY_API_VERSION,
  getPathsLabel,
  getProjectURL,
  isTranslationCommitted,
  isTranslationReadyToCommit,
} from '../../utils'
import { usePluginOptions } from '../PluginOptionsContext'
import { TranslationInfo } from './TranslationInfo'

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
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const toast = useToast()
  const [state, setState] = React.useState<'idle' | 'committing'>('idle')
  const { phraseRegion } = usePluginOptions()
  const { ready, draft, published } = useEditState(
    translation.tmd._ref,
    translation.tmd._type,
  )
  const TMD = (draft || published) as SanityTMD

  async function handleCommit(e: React.MouseEvent) {
    e.preventDefault()
    setState('committing')
    const res = await commitTranslation({ sanityClient, TMD })

    if (res.success) {
      toast.push({
        status: 'success',
        title: 'Translation committed successfully',
        description:
          'This translation has been finalized and merged into the target document(s)',
        closable: true,
      })
    } else {
      toast.push({
        status: 'error',
        title: 'Could not commit translation',
        description: typeof res.error === 'string' ? res.error : undefined,
        closable: true,
      })
    }
    setState('idle')
  }

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
              onClick={handleCommit}
              disabled={state !== 'idle'}
            />
          </Flex>
        )}
      </Stack>
    </Card>
  )
}
