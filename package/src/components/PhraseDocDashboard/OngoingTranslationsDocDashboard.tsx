'use client'

import { Button, Flex, Stack, Text, useToast } from '@sanity/ui'
import React from 'react'
import { useClient, useEditState, useSchema } from 'sanity'
import commitTranslation from '../../commitTranslation'
import {
  CreatedMainDocMetadata,
  CreatingMainDocMetadata,
  MainDocTranslationMetadata,
  SanityMainDoc,
  SanityTMD,
} from '../../types'
import {
  SANITY_API_VERSION,
  getFieldLabel,
  getProjectURL,
  isTranslationCommitted,
  isTranslationReadyToCommit,
  joinPathsByRoot,
  parsePathsString,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import { TranslationInfo } from './TranslationInfo'

export default function OngoingTranslationsDocDashboard(props: {
  ongoingTranslations: MainDocTranslationMetadata[]
  document: SanityMainDoc
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
              parentDoc={props.document}
            />
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
            parentDoc={props.document}
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
  const schema = useSchema()
  const sourceSchemaType = schema.get(translation.sourceDoc._type)
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
    return <div> Error (@todo)</div>
  }

  return (
    <DocDashboardCard
      title="Translation in progress"
      subtitle={
        sourceSchemaType && (
          <>
            {Object.entries(
              joinPathsByRoot(parsePathsString(translation.paths)),
            ).map(([rootPath, fullPathsInRoot]) => (
              <Text key={rootPath} size={1} muted>
                {getFieldLabel(rootPath, fullPathsInRoot, sourceSchemaType)}
              </Text>
            ))}
          </>
        )
      }
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
      {TMD.targets.map((target) => (
        <TranslationInfo
          key={target._key}
          paneParentDocId={parentDoc._id}
          parentDoc={parentDoc}
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
    </DocDashboardCard>
  )
}

function CreatingTranslationCard({
  translation,
}: {
  parentDoc: SanityMainDoc
  translation: CreatingMainDocMetadata
}) {
  const schema = useSchema()
  const sourceSchemaType = schema.get(translation.sourceDoc._type)
  return (
    <DocDashboardCard
      title="Translation being created"
      collapsible={false}
      subtitle={
        sourceSchemaType && (
          <>
            {Object.entries(
              joinPathsByRoot(parsePathsString(translation.paths)),
            ).map(([rootPath, fullPathsInRoot]) => (
              <Text key={rootPath} size={1} muted>
                {getFieldLabel(rootPath, fullPathsInRoot, sourceSchemaType)}
              </Text>
            ))}
          </>
        )
      }
    />
  )
}
