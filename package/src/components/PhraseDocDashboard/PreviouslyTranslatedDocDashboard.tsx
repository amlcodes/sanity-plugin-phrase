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
import getStaleTranslations, {
  getTranslatableTargetsByPath,
} from '../../staleTranslations/getStaleTranslations'
import {
  CrossSystemLangCode,
  SanityMainDoc,
  SanityTMD,
  StaleResponse,
  StaleStatus,
  TranslationRequest,
} from '../../types'
import {
  SANITY_API_VERSION,
  formatDay,
  getDiffsKey,
  getFieldLabel,
  getReadableLanguageName,
  joinDiffsByRoot,
  semanticListItems,
  undraftId,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import StatusBadge, { STALE_MAP } from '../StatusBadge'
import { Table, TableRow } from '../StyledTable'

export default function PreviouslyTranslatedDocDashboard(props: {
  currentDocument: SanityMainDoc
  docLang: string
  setToTranslate: React.Dispatch<
    React.SetStateAction<{
      diffs: TranslationRequest['diffs']
      targetLangs?: CrossSystemLangCode[] | undefined
    } | null>
  >
  TMDs: SanityTMD[]
}) {
  const { supportedTargetLangs } = usePluginOptions()
  const schema = useSchema()
  const schemaType = schema.get(props.currentDocument._type)
  const { ready, staleness, stalenessReloading } = useStaleness(props)

  if (!ready) {
    return <SpinnerBox />
  }

  const stalenessByPath = getTranslatableTargetsByPath(staleness?.targets)

  const canRequestTranslation = ready && !stalenessReloading && !!staleness

  function handleRequestTranslation(
    s: (typeof stalenessByPath)[keyof typeof stalenessByPath],
  ) {
    return function requestTranslation() {
      props.setToTranslate({
        diffs: s.diffs,
        targetLangs: s.langs,
      })
    }
  }

  const statusAggregate = (staleness?.targets || []).reduce(
    (agg, target) => {
      if ('status' in target) {
        agg[target.status] = (agg[target.status] || 0) + 1
      }
      return agg
    },
    {
      [StaleStatus.FRESH]: 0,
      [StaleStatus.ONGOING]: 0,
      [StaleStatus.STALE]: 0,
      [StaleStatus.UNTRANSLATABLE]: 0,
      [StaleStatus.UNTRANSLATED]: 0,
    } as Record<StaleStatus, number>,
  )
  const title = `Translation status: ${Object.entries(statusAggregate)
    .flatMap(([status, count]) => {
      if (count === 0) return []
      return `${count} ${
        STALE_MAP[status as StaleStatus]?.label || status.toLowerCase()
      }`
    })
    .join(', ')}`

  return (
    <DocDashboardCard title={title}>
      {!staleness && <SpinnerBox />}
      {stalenessReloading && (
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
        <Table>
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
                <td style={{ width: '100%', verticalAlign: 'middle' }}>
                  <Text size={1}>{getReadableLanguageName(target.lang)}</Text>
                </td>
                <td style={{ minWidth: '200px', verticalAlign: 'middle' }}>
                  {'error' in target ? (
                    'Failed fetching'
                  ) : (
                    <StatusBadge
                      label={
                        target.status === StaleStatus.STALE
                          ? 'Outdated'
                          : target.status
                      }
                      staleStatus={target.status}
                      inTable
                    />
                  )}
                </td>
                <td style={{ width: 'max-content', verticalAlign: 'middle' }}>
                  <Text size={1}>
                    {'translationDate' in target
                      ? formatDay(new Date(target.translationDate))
                      : ''}
                  </Text>
                </td>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
      {Object.keys(stalenessByPath).length > 0 && (
        <Card tone="caution" padding={2} radius={1} border>
          <Flex gap={3} align="flex-start">
            <Stack space={2} flex={1}>
              <Heading size={1} style={{ fontWeight: 600 }}>
                {title}
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
            const key = getDiffsKey(s.diffs)
            if (!schemaType) {
              return <Code key={key}>{JSON.stringify(s.diffs, null, 2)}</Code>
            }

            const isTranslated =
              s.diffs.length > 1 || s.diffs[0]?.path?.length > 0
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
                    {isTranslated ? 'Outdated for' : 'Not translated into'}{' '}
                    {semanticListItems(
                      s.langs.map((lang) => getReadableLanguageName(lang)),
                    )}
                    :
                  </Text>
                  {Object.entries(joinDiffsByRoot(s.diffs)).map(
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
  currentDocument,
  TMDs,
  docLang,
}: {
  currentDocument: SanityMainDoc
  TMDs: SanityTMD[]
  docLang: string
}) {
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const pluginOptions = usePluginOptions()
  const { sourceLang, supportedTargetLangs, langAdapter } = pluginOptions
  const sourceId = TMDs[0]?.sourceDoc?._id
  const isSource = docLang === sourceLang
  const { draft, published, ready } = useEditState(
    undraftId(isSource ? currentDocument._id : sourceId) || '',
    currentDocument._type,
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
    stalenessReloading:
      !!freshHash && !!staleness && staleness.hash !== freshHash,
  }
}
