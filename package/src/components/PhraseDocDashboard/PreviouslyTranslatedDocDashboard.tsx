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
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient, useEditState, useSchema } from 'sanity'
import useDebounce from '../../hooks/useDebounce'
import getStaleTranslations from '../../staleTranslations/getStaleTranslations'
import {
  CrossSystemLangCode,
  SanityMainDoc,
  StaleResponse,
  StaleStatus,
  StaleTargetStatus,
  TargetLangStaleness,
  TranslationRequest,
} from '../../types'
import {
  SANITY_API_VERSION,
  formatDay,
  getFieldLabel,
  getPathsKey,
  getReadableLanguageName,
  joinPathsByRoot,
  semanticListItems,
  undraftId,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import StatusBadge from '../StatusBadge'
import { StyledTable, TableRow } from '../StyledTable'

export default function PreviouslyTranslatedDocDashboard(props: {
  document: SanityMainDoc
  docLang: string
  setToTranslate: React.Dispatch<
    React.SetStateAction<{
      paths: TranslationRequest['paths']
      targetLangs?: CrossSystemLangCode[] | undefined
    } | null>
  >
}) {
  const schema = useSchema()
  const schemaType = schema.get(props.document._type)
  const { ready, staleness, stalenessLoading } = useStaleness(props)

  if (!ready) {
    return <SpinnerBox />
  }

  const stalenessByPath = getStaleTargetsByPath(staleness?.targets)

  const canRequestTranslation = ready && !stalenessLoading && !!staleness

  function handleRequestTranslation(
    s: (typeof stalenessByPath)[keyof typeof stalenessByPath],
  ) {
    return function requestTranslation() {
      props.setToTranslate({
        paths: s.changedPaths,
        targetLangs: s.langs,
      })
    }
  }

  return (
    <DocDashboardCard
      title="Translation in Phrase"
      subtitle="The document has been translated into the following languages"
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
                Last translated
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
                <td style={{ width: 'max-content' }}>
                  <Text size={1}>
                    {'translationDate' in target
                      ? formatDay(new Date(target.translationDate))
                      : ''}
                  </Text>
                </td>
              </TableRow>
            ))}
          </tbody>
        </StyledTable>
      )}
      {Object.keys(stalenessByPath).length > 0 && (
        <Card tone="caution" padding={2} radius={1} border>
          <Flex gap={3} align="flex-start">
            <Stack space={2} flex={1}>
              <Heading size={1} style={{ fontWeight: 600 }}>
                Translation is outdated
              </Heading>
              <Text size={1} muted>
                This document has been modified since last translation
                {Object.keys(stalenessByPath).length > 1 ? 's' : ''}.
              </Text>
            </Stack>
            {Object.keys(stalenessByPath).length === 1 && (
              <Card tone="default" style={{ flex: '0 0 max-content' }}>
                <Button
                  text="Translate changes"
                  tone="primary"
                  fontSize={1}
                  padding={3}
                  iconRight={PhraseMonogram}
                  onClick={handleRequestTranslation(
                    Object.values(stalenessByPath)[0],
                  )}
                  disabled={!canRequestTranslation}
                />
              </Card>
            )}
          </Flex>
          {Object.values(stalenessByPath).map((s) => {
            const key = getPathsKey(s.changedPaths)
            if (!schemaType) {
              return (
                <Code key={key}>{JSON.stringify(s.changedPaths, null, 2)}</Code>
              )
            }

            return (
              <Flex
                gap={3}
                align="flex-start"
                key={key}
                style={{
                  borderTop: '1px solid var(--card-border-color)',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                }}
              >
                <Stack space={3} flex={1}>
                  <Text size={1} weight="semibold">
                    Outdated for{' '}
                    {semanticListItems(
                      s.langs.map((lang) =>
                        getReadableLanguageName(lang.sanity),
                      ),
                    )}
                    :
                  </Text>
                  {Object.entries(joinPathsByRoot(s.changedPaths)).map(
                    ([rootPath, fullPathsInRoot]) => (
                      <Text key={rootPath} size={1} muted>
                        {getFieldLabel(rootPath, fullPathsInRoot, schemaType)}
                      </Text>
                    ),
                  )}
                </Stack>
                {Object.keys(stalenessByPath).length > 1 && (
                  <Card tone="default" style={{ flex: '0 0 max-content' }}>
                    <Button
                      text="Translate changes"
                      tone="primary"
                      fontSize={1}
                      padding={3}
                      iconRight={PhraseMonogram}
                      onClick={handleRequestTranslation(s)}
                      disabled={!canRequestTranslation}
                    />
                  </Card>
                )}
              </Flex>
            )
          })}
        </Card>
      )}
    </DocDashboardCard>
  )
}

function useStaleness({
  document,
  docLang,
}: {
  document: SanityMainDoc
  docLang: string
}) {
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
  const sourceDoc = useMemo(
    () =>
      freshSourceDoc &&
      ({
        _id: id,
        _rev: rev,
        _type: freshSourceDoc?._type,
        lang: langAdapter.sanityToCrossSystem(docLang),
      } as TranslationRequest['sourceDoc']),
    [freshSourceDoc, id, rev, docLang, langAdapter],
  )

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

  return {
    ready,
    staleness,
    stalenessLoading: freshHash && !!staleness && staleness.hash !== freshHash,
  }
}

function isTargetStale(
  target: TargetLangStaleness,
): target is StaleTargetStatus {
  return 'status' in target && target.status === StaleStatus.STALE
}

function getStaleTargetsByPath(targets: TargetLangStaleness[] = []) {
  return targets.reduce(
    (byPath, t) => {
      if (!isTargetStale(t)) return byPath

      const pathKey = getPathsKey(t.changedPaths)
      return {
        ...byPath,
        [pathKey]: {
          langs: [...(byPath[pathKey]?.langs || []), t.lang],
          changedPaths: t.changedPaths,
          translationDate: t.translationDate,
        },
      }
    },
    {} as Record<
      string,
      {
        langs: StaleTargetStatus['lang'][]
      } & Pick<StaleTargetStatus, 'changedPaths' | 'translationDate'>
    >,
  )
}
