'use client'

import { PublishIcon, RefreshIcon } from '@sanity/icons'
import { Button, Flex, Spinner, Text, useToast } from '@sanity/ui'
import React, { useState } from 'react'
import { useClient, useEditState, useSchema } from 'sanity'
import mergePTD from '../../mergePTD'
import {
  EndpointActionTypes,
  PtdPhraseMetadata,
  SanityPTD,
  SanityTMD,
  TranslationRequest,
} from '../../types'
import { SANITY_API_VERSION, getProjectURL } from '../../utils'
import { getReadableLanguageName } from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { usePluginOptions } from '../PluginOptionsContext'
import { TranslationInfo } from './TranslationInfo'
import { useOpenInSidePane } from './useOpenInSidepane'
import { PhraseMonogram } from '../PhraseLogo'

const API_ENDPOINT = '/api/phrase'

export default function PtdDocDashboard({
  document: ptdDocument,
  ptdMetadata,
}: {
  document: SanityPTD
  ptdMetadata: PtdPhraseMetadata
}) {
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const toast = useToast()
  const { phraseRegion } = usePluginOptions()
  const { ready, draft, published } = useEditState(
    ptdDocument?.phraseMetadata?.tmd?._ref || '',
    ptdDocument?.phraseMetadata?.tmd?._type || 'document',
  )
  const TMD = (draft || published) as SanityTMD
  const [state, setState] = useState<'idle' | 'refreshing' | 'merging'>('idle')
  const [, setError] = useState<{ title: string; error: unknown } | undefined>()
  const schema = useSchema()
  const schemaType = schema.get(ptdDocument._type)
  const openInSidePane = useOpenInSidePane(ptdDocument._id)

  if (!ready) {
    return <Spinner />
  }

  if (!TMD) {
    return <div>error @todo</div>
  }

  const targetLang = ptdMetadata.targetLang
  const sourceDoc: TranslationRequest['sourceDoc'] = {
    _id: TMD.sourceDoc._ref,
    _type: ptdDocument._type,
    _rev: TMD.sourceSnapshot._rev,
    lang: TMD.sourceLang,
  }
  const target = TMD.targets.find((t) => t.lang.sanity === targetLang.sanity)

  async function handleRefresh() {
    setState('refreshing')
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        action: EndpointActionTypes.REFRESH_PTD,
        ptdId: ptdDocument._id,
      }),
    })
    if (!res.ok) {
      setError({
        title: 'Could not refresh Phrase data',
        error: res.statusText,
      })
    }

    setState('idle')
  }

  async function handleMerge(e: React.MouseEvent) {
    e.preventDefault()
    setState('merging')
    const res = await mergePTD({ sanityClient, PTD: ptdDocument })

    if (res.success) {
      toast.push({
        status: 'success',
        title: 'Translation merged successfully',
        description:
          'This translation has been merged into the target document',
        closable: true,
      })
    } else {
      toast.push({
        status: 'error',
        title: 'Could not merge translation',
        description: typeof res.error === 'string' ? res.error : undefined,
        closable: true,
      })
    }
    setState('idle')
  }

  return (
    <DocDashboardCard
      title="This is a Phrase Translation document"
      subtitle={
        schemaType ? (
          <Text>
            This content was translated in Phrase from the{' '}
            <a
              href={openInSidePane.getHref(sourceDoc._id, schemaType.name)}
              onClick={(e) => {
                e.preventDefault()
                openInSidePane.openImperatively(sourceDoc._id, schemaType.name)
              }}
            >
              source document in{' '}
              {getReadableLanguageName(TMD.sourceLang.sanity)}
            </a>{' '}
            to {getReadableLanguageName(targetLang.sanity)} and is now ready to
            merge with the{' '}
            {target?.targetDoc?._ref ? (
              <a
                href={openInSidePane.getHref(
                  target.targetDoc._ref,
                  schemaType.name,
                )}
                onClick={(e) => {
                  e.preventDefault()
                  openInSidePane.openImperatively(
                    target.targetDoc._ref,
                    schemaType.name,
                  )
                }}
              >
                target document in {getReadableLanguageName(targetLang.sanity)}
              </a>
            ) : (
              'target document'
            )}
            .
          </Text>
        ) : null
      }
      headerActions={
        <Button
          size={1}
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
      <TranslationInfo
        parentDoc={ptdDocument}
        TMD={TMD}
        paneParentDocId={ptdDocument._id}
        targetLang={ptdMetadata.targetLang}
        showOpenPTD={false}
      />
      <Flex gap={2} justify="space-between">
        <Button
          fontSize={1}
          padding={3}
          text="Refresh Phrase data"
          tone="primary"
          mode={'ghost'}
          onClick={handleRefresh}
          disabled={state !== 'idle'}
          icon={RefreshIcon}
        />
        <Button
          fontSize={1}
          padding={3}
          text="Merge translation"
          tone={'positive'}
          mode={'ghost'}
          disabled={state !== 'idle'}
          onClick={handleMerge}
          icon={PublishIcon}
        />
      </Flex>
    </DocDashboardCard>
  )
}
