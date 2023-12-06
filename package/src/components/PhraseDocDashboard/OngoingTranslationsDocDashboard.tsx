'use client'

import { InfoOutlineIcon } from '@sanity/icons'
import { Button, Card, Flex, Stack, Text, useToast } from '@sanity/ui'
import React from 'react'
import { useClient, useEditState } from 'sanity'
import commitTranslation from '../../commitTranslation'
import {
  CreatedMainDocMetadata,
  CreatingMainDocMetadata,
  DeletedMainDocMetadata,
  FailedPersistingMainDocMetadata,
  MainDocTranslationMetadata,
  SanityMainDoc,
  SanityTMD,
} from '../../types'
import {
  SANITY_API_VERSION,
  getProjectURL,
  isTranslationCommitted,
  isTranslationReadyToCommit,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import { TranslationPathsDisplay } from '../TranslationPathsDisplay'
import { TranslationInfo, TranslationInfoTable } from './TranslationInfo'

export default function OngoingTranslationsDocDashboard(props: {
  ongoingTranslations: MainDocTranslationMetadata[]
  currentDocument: SanityMainDoc
}) {
  return (
    <Stack space={4}>
      {props.ongoingTranslations.map((translation) => {
        if (isTranslationCommitted(translation)) return null

        if (translation.status === 'CREATING')
          return (
            <CreatingTranslationCard
              key={translation._key}
              translation={translation}
              parentDoc={props.currentDocument}
            />
          )

        if (translation.status === 'FAILED_PERSISTING') {
          return (
            <FailedPersistingTranslationCard
              key={translation._key}
              translation={translation}
              parentDoc={props.currentDocument}
            />
          )
        }

        if (translation.status === 'DELETED') {
          return (
            <DeletedTranslationCard
              key={translation._key}
              translation={translation}
              parentDoc={props.currentDocument}
            />
          )
        }

        return (
          <OngoingTranslationCard
            key={translation._key}
            translation={translation}
            parentDoc={props.currentDocument}
          />
        )
      })}
    </Stack>
  )
}

function OngoingTranslationCard({
  translation,
  parentDoc,
}: {
  parentDoc: SanityMainDoc
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
    return <SpinnerBox />
  }

  if (!TMD) {
    return (
      <DocDashboardCard
        title="Broken translation"
        subtitle={<TranslationPathsDisplay {...translation} />}
      >
        <Text>
          This document reached a broken translation state. Please contact
          support.
        </Text>
      </DocDashboardCard>
    )
  }

  return (
    <DocDashboardCard
      title="Translation in progress"
      subtitle={<TranslationPathsDisplay {...translation} />}
      headerActions={
        <Button
          as="a"
          href={getProjectURL(TMD.phraseProjectUid, phraseRegion)}
          target="_blank"
          rel="noopener noreferrer"
          text="Project in Phrase"
          mode="ghost"
          tone="primary"
          iconRight={PhraseMonogram}
          fontSize={1}
          padding={2}
          // Prevent the card from collapsing when clicking the button
          onClick={(e) => e.stopPropagation()}
        />
      }
    >
      <TranslationInfoTable>
        {TMD.targets.map((target) => (
          <TranslationInfo
            key={target._key}
            paneParentDocId={parentDoc._id}
            parentDoc={parentDoc}
            targetLang={target.lang}
            TMD={TMD}
          />
        ))}
      </TranslationInfoTable>

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
    </DocDashboardCard>
  )
}

function DeletedTranslationCard({
  translation,
  parentDoc,
}: {
  parentDoc: SanityMainDoc
  translation: DeletedMainDocMetadata
}) {
  const { ready, draft, published } = useEditState(
    translation.tmd._ref,
    translation.tmd._type,
  )
  const TMD = (draft || published) as SanityTMD

  return (
    <DocDashboardCard
      title="Translation deleted in Phrase"
      subtitle={<TranslationPathsDisplay {...translation} />}
    >
      {!ready && <SpinnerBox />}
      <TranslationInfoTable>
        {TMD?.targets.map((target) => (
          <TranslationInfo
            key={target._key}
            paneParentDocId={parentDoc._id}
            parentDoc={parentDoc}
            targetLang={target.lang}
            TMD={TMD}
          />
        ))}
      </TranslationInfoTable>
    </DocDashboardCard>
  )
}

function CreatingTranslationCard({
  translation,
}: {
  parentDoc: SanityMainDoc
  translation: CreatingMainDocMetadata
}) {
  return (
    <DocDashboardCard
      title="Translation being created"
      collapsible={false}
      subtitle={<TranslationPathsDisplay {...translation} />}
    />
  )
}

function FailedPersistingTranslationCard({
  translation,
}: {
  parentDoc: SanityMainDoc
  translation: FailedPersistingMainDocMetadata
}) {
  return (
    <DocDashboardCard
      title="Translation creation failed"
      collapsible={false}
      subtitle={<TranslationPathsDisplay {...translation} />}
    >
      <Card padding={4} border radius={2} tone="critical">
        <Flex gap={3} align="flex-start">
          <Text size={2}>
            <InfoOutlineIcon />
          </Text>
          {/* @TODO: attempt to salvage translation */}
          <Text size={2}>
            DEV: Ability to salvage failed translations isn't yet implemented
          </Text>
        </Flex>
      </Card>
    </DocDashboardCard>
  )
}
