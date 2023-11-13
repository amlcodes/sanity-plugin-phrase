'use client'

import { PublishIcon, RefreshIcon } from '@sanity/icons'
import { Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import { useClient, useSchema } from 'sanity'
import {
  EndpointActionTypes,
  PtdPhraseMetadata,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '../types'
import { getProjectURL, ptdMetadataExtractor } from '../utils'
import { TranslationInfo } from './TranslationInfo'
import { useOpenInSidePane } from './useOpenInSidepane'

const API_ENDPOINT = '/api/phrase'

export default function PtdDocDashboard({
  document: ptdDocument,
  ptdMetadata,
}: {
  document: SanityDocumentWithPhraseMetadata
  ptdMetadata: PtdPhraseMetadata
}) {
  const sanityClient = useClient({ apiVersion: '2023-11-10' })
  const [state, setState] = useState<'idle' | 'refreshing' | 'committing'>(
    'idle',
  )
  const [errors, setError] = useState<
    { title: string; error: unknown } | undefined
  >()
  const schema = useSchema()
  const schemaType = schema.get(ptdDocument._type)
  const openInSidePane = useOpenInSidePane(ptdDocument._id)
  const sourceDoc: TranslationRequest['sourceDoc'] = {
    _id: ptdMetadata.sourceDoc._ref,
    _type: ptdDocument._type,
    // @TODO: include _ref in PTD metadata
    _rev: ptdMetadata.sourceDoc._ref,
    lang: ptdMetadata.targetLang,
  }

  const meta = ptdMetadataExtractor(ptdMetadata)
  const readyToMerge = meta.stepStatus === 'COMPLETED'

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

  return (
    <Card paddingX={3} paddingY={4} border radius={2}>
      <Stack space={4}>
        <Flex align="flex-start" gap={5}>
          <Stack space={3}>
            <Heading size={2} as="h2" style={{ flex: 1 }}>
              This is a Phrase Translation document
            </Heading>
            {schemaType && (
              <Text>
                This content was translated in Phrase to pt and is now ready to
                merge with the{' '}
                <a
                  href={openInSidePane.getHref(sourceDoc._id, schemaType.name)}
                  onClick={(e) => {
                    e.preventDefault()
                    openInSidePane.openImperatively(
                      sourceDoc._id,
                      schemaType.name,
                    )
                  }}
                >
                  source document
                </a>
                .
              </Text>
            )}
          </Stack>
          <Button
            size={1}
            as="a"
            href={getProjectURL(
              ptdMetadata.projectUid,
              // @TODO: make configurable
              'us',
            )}
            target="_blank"
            rel="noopener noreferrer"
            mode="ghost"
            text="Project in Phrase"
          />
        </Flex>
        <TranslationInfo
          sourceDoc={sourceDoc}
          paths={ptdMetadata.paths}
          paneParentDocId={ptdDocument._id}
          ptdMetadata={ptdMetadata}
          targetLang={ptdMetadata.targetLang}
        />
        <Flex gap={2}>
          <Button
            text="Refresh translation"
            tone="primary"
            mode={readyToMerge ? 'bleed' : 'default'}
            onClick={handleRefresh}
            disabled={state !== 'idle'}
            icon={RefreshIcon}
            style={{ flex: 1 }}
          />
          <Button
            text="Commit & merge"
            tone={readyToMerge ? 'critical' : 'positive'}
            mode={readyToMerge ? 'default' : 'bleed'}
            disabled={state !== 'idle'}
            icon={PublishIcon}
            style={{ flex: 1 }}
          />
        </Flex>
      </Stack>
    </Card>
  )
}
