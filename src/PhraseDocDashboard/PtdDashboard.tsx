'use client'

import { PublishIcon, RefreshIcon } from '@sanity/icons'
import { Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import { useClient, useSchema } from 'sanity'
import {
  PtdPhraseMetadata,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '../types'
import { getProjectURL, ptdMetadataExtractor } from '../utils'
import { TranslationInfo } from './TranslationInfo'
import { useOpenInSidePane } from './useOpenInSidepane'

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
    const res = await fetch('/api/refresh-ptd', {
      method: 'POST',
      body: JSON.stringify({ id: ptdDocument._id }),
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
    <Card padding={3} border>
      <Stack space={4}>
        <Flex align="center" gap={3}>
          <Stack space={2}>
            <Heading size={1} as="h2" style={{ flex: 1 }}>
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
        <Flex>
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
