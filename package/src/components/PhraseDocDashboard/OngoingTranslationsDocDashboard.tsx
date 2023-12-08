'use client'

import { InfoOutlineIcon, TrashIcon } from '@sanity/icons'
import { Button, Card, Flex, Stack, Text, useToast } from '@sanity/ui'
import React, { MouseEvent } from 'react'
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
  draftId,
  getProjectURL,
  isTranslationCommitted,
  isTranslationReadyToCommit,
  undraftId,
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

        if (
          translation.status === 'DELETED' ||
          translation.status === 'CANCELLED'
        ) {
          return (
            <DeletedTranslationCard
              key={translation._key}
              translation={translation as DeletedMainDocMetadata}
              parentDoc={props.currentDocument}
            />
          )
        }

        return (
          <OngoingTranslationCard
            key={translation._key}
            translation={translation as CreatedMainDocMetadata}
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
  const client = useClient({ apiVersion: SANITY_API_VERSION })
  const toast = useToast()
  const { ready, draft, published } = useEditState(
    translation.tmd._ref,
    translation.tmd._type,
  )
  const TMD = (draft || published) as SanityTMD

  async function deleteTranslation(e: MouseEvent) {
    e.preventDefault()
    const mainDocRefs = [
      TMD.sourceDoc._ref,
      ...TMD.targets.map((t) => t.targetDoc._ref),
    ].filter(Boolean)
    const mainDocIds = await client.fetch<string[]>('*[_id in $ids]._id', {
      ids: mainDocRefs.flatMap((ref) => [undraftId(ref), draftId(ref)]),
    })

    const translationKey = TMD.translationKey

    const unsetTx = client.transaction()
    mainDocIds.forEach((id) => {
      unsetTx.patch(id, (patch) =>
        patch.unset([`phraseMetadata.translations[_key=="${translationKey}"]`]),
      )
    })
    try {
      await unsetTx.commit()
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not delete translation',
        description: typeof error === 'string' ? error : undefined,
        closable: true,
      })
      return
    }

    const deleteTMDAndPTDsTx = client.transaction()
    deleteTMDAndPTDsTx.delete(TMD._id)
    TMD.targets.forEach((target) => {
      deleteTMDAndPTDsTx.delete(target.ptd._ref)
    })

    try {
      await deleteTMDAndPTDsTx.commit()
    } catch (error) {
      console.error("Couldn't delete TMD and PTDs", error)
      // Do nothing about dangling TMDs & PTDs - let them be cleaned up later
    }

    toast.push({
      status: 'success',
      title: 'Translation deleted successfully',
      description: 'This translation has been deleted from the document',
      closable: true,
    })
  }
  return (
    <DocDashboardCard
      title="Translation deleted in Phrase"
      subtitle={<TranslationPathsDisplay {...translation} />}
      collapsible={false}
    >
      {!ready && <SpinnerBox />}
      {ready && (
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
      )}
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
            {
              "DEV: Ability to salvage failed translations isn't yet implemented"
            }
          </Text>
        </Flex>
      </Card>
    </DocDashboardCard>
  )
}
