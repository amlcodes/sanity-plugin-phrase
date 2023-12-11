'use client'

import { InfoOutlineIcon, TrashIcon } from '@sanity/icons'
import { Button, Card, Flex, Stack, Text, useToast } from '@sanity/ui'
import React, { MouseEvent } from 'react'
import { useClient } from 'sanity'
import commitTranslation from '../../commitTranslation'
import { SanityMainDoc, SanityTMD } from '../../types'
import {
  SANITY_API_VERSION,
  getProjectURL,
  isTranslationCancelled,
  isTranslationCommitted,
  isTranslationCreating,
  isTranslationFailedPersisting,
  isTranslationReadyToCommit,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import { TranslationPathsDisplay } from '../TranslationPathsDisplay'
import { TranslationInfo, TranslationInfoTable } from './TranslationInfo'

export default function OngoingTranslationsDocDashboard(props: {
  ongoingTranslations: SanityTMD[]
  currentDocument: SanityMainDoc
}) {
  return (
    <Stack space={4}>
      {props.ongoingTranslations.map((TMD) => {
        if (isTranslationCommitted(TMD)) return null

        if (isTranslationCreating(TMD))
          return <CreatingTranslationCard key={TMD._id} TMD={TMD} />

        if (isTranslationFailedPersisting(TMD)) {
          return <FailedPersistingTranslationCard key={TMD._id} TMD={TMD} />
        }

        if (isTranslationCancelled(TMD)) {
          return <DeletedTranslationCard key={TMD._id} TMD={TMD} />
        }

        return (
          <OngoingTranslationCard
            key={TMD._id}
            TMD={TMD}
            parentDoc={props.currentDocument}
          />
        )
      })}
    </Stack>
  )
}

function OngoingTranslationCard({
  TMD,
  parentDoc,
}: {
  parentDoc: SanityMainDoc
  TMD: SanityTMD
}) {
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const toast = useToast()
  const [state, setState] = React.useState<'idle' | 'committing'>('idle')
  const { phraseRegion } = usePluginOptions()

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

  if (!TMD.phraseProjectUid) return null

  return (
    <DocDashboardCard
      title="Translation in progress"
      subtitle={<TranslationPathsDisplay {...TMD} />}
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

      {isTranslationReadyToCommit(TMD) && (
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

function useDeleteTranslation(TMD: SanityTMD) {
  const client = useClient({ apiVersion: SANITY_API_VERSION })
  const toast = useToast()

  async function deleteTranslation(e: MouseEvent) {
    e.preventDefault()

    const tx = client.transaction()
    tx.delete(TMD._id)
    TMD.targets.forEach((target) => {
      tx.delete(target.ptd._ref)
    })

    try {
      await tx.commit()

      toast.push({
        status: 'success',
        title: 'Translation deleted successfully',
        description: 'This translation has been deleted from the document',
        closable: true,
      })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not delete translation',
        description: typeof error === 'string' ? error : undefined,
        closable: true,
      })
    }
  }

  return deleteTranslation
}

function DeletedTranslationCard({
  TMD,
}: {
  TMD: SanityTMD<'CANCELLED'> | SanityTMD<'DELETED'>
}) {
  const deleteTranslation = useDeleteTranslation(TMD)
  return (
    <DocDashboardCard
      title="Translation deleted in Phrase"
      subtitle={<TranslationPathsDisplay {...TMD} />}
      collapsible={false}
    >
      <Stack space={4}>
        <Text>
          In order to issue a new translation, you must first delete this one
        </Text>
        <Button
          text="Delete translation"
          onClick={deleteTranslation}
          mode="ghost"
          tone="caution"
          icon={TrashIcon}
        />
      </Stack>
    </DocDashboardCard>
  )
}

function CreatingTranslationCard({ TMD }: { TMD: SanityTMD<'CREATING'> }) {
  return (
    <DocDashboardCard
      title="Translation being created"
      collapsible={false}
      subtitle={<TranslationPathsDisplay {...TMD} />}
    />
  )
}

function FailedPersistingTranslationCard({
  TMD,
}: {
  TMD: SanityTMD<'FAILED_PERSISTING'>
}) {
  const deleteTranslation = useDeleteTranslation(TMD)
  const { phraseRegion } = usePluginOptions()

  return (
    <DocDashboardCard
      title="Translation creation failed"
      collapsible={false}
      subtitle={<TranslationPathsDisplay {...TMD} />}
    >
      <Card padding={4} border radius={2} tone="caution">
        <Flex gap={3} align="flex-start">
          <Text size={3} muted>
            <InfoOutlineIcon />
          </Text>
          <Stack space={4}>
            <Text size={2}>
              This translation created in Phrase but couldn't be brought back
              into this content. Please delete the project in Phrase and then
              click below to delete this translation
            </Text>

            <Flex gap={2} align="center">
              {!!(TMD.salvaged?.project?.id || TMD.phraseProjectUid) && (
                <Button
                  text="Project in Phrase"
                  as="a"
                  href={getProjectURL(
                    TMD.salvaged?.project?.id || TMD.phraseProjectUid,
                    phraseRegion,
                  )}
                  icon={PhraseMonogram}
                  tone="primary"
                />
              )}
              <Button
                text="Delete translation"
                onClick={deleteTranslation}
                icon={TrashIcon}
              />
            </Flex>
          </Stack>
        </Flex>
      </Card>
    </DocDashboardCard>
  )
}
