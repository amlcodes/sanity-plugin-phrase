'use client'

import {
  Button,
  Card,
  Code,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@sanity/ui'
import { useCallback, useEffect, useState } from 'react'
import { useClient, useEditState, useSchema } from 'sanity'
import useDebounce from '../../hooks/useDebounce'
import getStaleTranslations from '../../staleTranslations/getStaleTranslations'
import {
  SanityMainDoc,
  StaleResponse,
  StaleStatus,
  TranslationRequest,
} from '../../types'
import {
  SANITY_API_VERSION,
  getFieldLabel,
  getReadableLanguageName,
  joinPathsByRoot,
  undraftId,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import { StyledTable, TableRow } from '../StyledTable'
import StatusBadge from '../StatusBadge'
import { PhraseMonogram } from '../PhraseLogo'

export default function PreviouslyTranslatedDocDashboard({
  document,
  docLang,
}: {
  document: SanityMainDoc
  docLang: string
}) {
  const schema = useSchema()
  const schemaType = schema.get(document._type)
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const pluginOptions = usePluginOptions()
  const { sourceLang, supportedTargetLangs, langAdapter } = pluginOptions
  const sourceId = document.phraseMetadata.translations[0]?.sourceDoc?._id
  const isSource = docLang === sourceLang
  const { draft, published, ready } = useEditState(
    undraftId(isSource ? document._id : sourceId) || '',
    document._type,
  )
  const freshSourceDoc = draft || published
  const rev = freshSourceDoc?._rev
  const id = freshSourceDoc?._id
  const freshHash = id && rev ? `${id}-${rev}` : undefined
  const debouncedHash = useDebounce(freshHash, 4000)
  const sourceDoc =
    freshSourceDoc &&
    ({
      _id: id,
      _rev: rev,
      _type: freshSourceDoc?._type,
      lang: langAdapter.sanityToCrossSystem(docLang),
    } as TranslationRequest['sourceDoc'])
  const [staleness, setStaleness] = useState<
    (StaleResponse & { hash: typeof debouncedHash }) | undefined
  >()

  const getStaleness = useCallback(
    async function getStaleness() {
      if (!sourceDoc) return

      const res = await getStaleTranslations({
        sourceDocs: [sourceDoc],
        sanityClient,
        pluginOptions,
        targetLangs: supportedTargetLangs,
      })
      const newStaleness = res.find((r) => r.sourceDoc?._id === sourceDoc._id)
      setStaleness(
        newStaleness ? { ...newStaleness, hash: debouncedHash } : undefined,
      )
    },
    [
      sourceDoc,
      sanityClient,
      pluginOptions,
      supportedTargetLangs,
      setStaleness,
      debouncedHash,
    ],
  )

  useEffect(
    () => {
      if (debouncedHash) getStaleness()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedHash],
  )

  if (!ready) {
    return <SpinnerBox />
  }

  const stalenessLoading =
    freshHash && !!staleness && staleness.hash !== freshHash
  console.log({ staleness })

  const needsRetranslation =
    staleness?.targets.filter(
      (t) => 'status' in t && t.status === StaleStatus.STALE,
    ) || []
  // @TODO: finish translation
  // const toRetranslate
  return (
    // @TODO: only fetch staleness if DocDashboardCard has expanded before
    <DocDashboardCard
      title="Translation in Phrase"
      subtitle="The document has been translated into the following languages"
      collapsible={false}
    >
      {!staleness && <SpinnerBox />}
      {stalenessLoading && (
        <Card padding={4} border radius={2} tone="primary">
          <Flex gap={3} align="flex-start">
            <Spinner />
            <Text size={2} weight="semibold">
              Re-analyzing changed content...
            </Text>
          </Flex>
        </Card>
      )}
      {staleness && (
        <StyledTable>
          <thead>
            <th>
              <Text size={1} weight="semibold">
                Language
              </Text>
            </th>
            <th>
              <Text size={1} weight="semibold" style={{ whiteSpace: 'nowrap' }}>
                Target languages
              </Text>
            </th>
            <th>
              <Text size={1} weight="semibold">
                Due dates
              </Text>
            </th>
            <th>
              <Text size={1} weight="semibold">
                <span className="sr-only">Actions</span>
              </Text>
            </th>
          </thead>
          <tbody>
            {staleness.targets.map((target) => (
              <TableRow key={target.lang.sanity}>
                <td style={{ width: '100%' }}>
                  <Text size={1}>
                    {getReadableLanguageName(target.lang.sanity)}
                  </Text>
                </td>
                <td style={{ width: 'min-content' }}>
                  {'error' in target ? (
                    'Failed fetching'
                  ) : (
                    <StatusBadge
                      label={target.status}
                      staleStatus={target.status}
                    />
                  )}
                </td>
                <td>
                  <Text size={1}>
                    {'translationDate' in target ? target.translationDate : ''}
                  </Text>
                </td>
              </TableRow>
            ))}
          </tbody>
        </StyledTable>
      )}
      {needsRetranslation.length > 0 && (
        <Card tone="caution" padding={2} radius={1} border>
          <Stack space={4}>
            <Flex gap={2} align="flex-start">
              <Stack space={2}>
                <Heading size={1} style={{ fontWeight: 600 }}>
                  Translation is outdated
                </Heading>
                <Text size={1} muted>
                  You've modified fields in this document. Request a new
                  translation in Phrase.
                </Text>
              </Stack>
              <Button
                text="Translate in Phrase"
                tone="primary"
                fontSize={1}
                padding={3}
                iconRight={PhraseMonogram}
                onClick={console.log}
              />
            </Flex>
            {needsRetranslation.map((target) => {
              if (!('status' in target) || target.status !== StaleStatus.STALE)
                return null

              if (!schemaType) {
                return (
                  <Code key={target.lang.sanity}>
                    {JSON.stringify(target.changedPaths, null, 2)}
                  </Code>
                )
              }

              return (
                <Stack space={2} key={target.lang.sanity}>
                  <Text size={1} weight="semibold">
                    {getReadableLanguageName(target.lang.sanity)}
                  </Text>
                  {Object.entries(joinPathsByRoot(target.changedPaths)).map(
                    ([rootPath, fullPathsInRoot]) => (
                      <Text size={1} key={rootPath}>
                        {getFieldLabel(rootPath, fullPathsInRoot, schemaType)}
                      </Text>
                    ),
                  )}
                </Stack>
              )
            })}
          </Stack>
        </Card>
      )}
    </DocDashboardCard>
  )
}
