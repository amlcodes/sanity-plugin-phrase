'use client'

import {
  EllipsisVerticalIcon,
  EyeOpenIcon,
  PublishIcon,
  RefreshIcon,
} from '@sanity/icons'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  Spinner,
  Text,
  useToast,
} from '@sanity/ui'
import { MouseEvent, PropsWithChildren, useState } from 'react'
import { SanityDocument, useClient, useEditState, useSchema } from 'sanity'
import { useOpenInSidePane } from '../../hooks/useOpenInSidepane'
import mergePTD from '../../mergePTD'
import {
  CrossSystemLangCode,
  EndpointActionTypes,
  SanityPTD,
  SanityTMD,
} from '../../types'
import {
  SANITY_API_VERSION,
  formatDay,
  getJobEditorURL,
  jobsMetadataExtractor,
} from '../../utils'
import { getReadableLanguageName, langsAreTheSame } from '../../utils/langs'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import StatusBadge from '../StatusBadge'
import { Table, TableRow } from '../StyledTable'

export function TranslationInfo({
  targetLang,
  parentDoc,
  paneParentDocId,
  TMD,
  showOpenPTD = true,
}: {
  targetLang: CrossSystemLangCode
  parentDoc: SanityDocument
  paneParentDocId: string
  TMD: SanityTMD | 'loading'
  // eslint-disable-next-line
  showOpenPTD?: boolean
}) {
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const { phraseRegion, apiEndpoint } = usePluginOptions()
  const schema = useSchema()
  const schemaType = schema.get(parentDoc._type)
  const openInSidePane = useOpenInSidePane(paneParentDocId)
  const [state, setState] = useState<'idle' | 'refreshing' | 'merging'>('idle')

  const target =
    typeof TMD === 'object'
      ? TMD.targets.find((t) => langsAreTheSame(t.lang, targetLang))
      : undefined
  const ptdId = target && target?.ptd?._ref
  const jobsMeta =
    target && target?.jobs ? jobsMetadataExtractor(target.jobs) : undefined
  const toast = useToast()
  const PTDState = useEditState(
    ptdId || '',
    (typeof TMD === 'object' && TMD.sourceDoc?._type) || 'document',
  )
  const PTD = PTDState.ready
    ? ((PTDState.draft || PTDState.published) as SanityPTD)
    : undefined

  async function handleMerge(e: MouseEvent) {
    e.preventDefault()

    if (!PTD) return
    setState('merging')
    const res = await mergePTD({ sanityClient, PTD })

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

  async function handleRefresh(e: MouseEvent) {
    e.preventDefault()

    if (!ptdId) return

    setState('refreshing')
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        action: EndpointActionTypes.REFRESH_PTD,
        ptdId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (res.ok) {
      toast.push({
        status: 'success',
        title: 'Translation refreshed successfully',
        description:
          'The translation now contains the freshest data from Phrase',
        closable: true,
      })
    } else {
      const resBody = await res.json().catch(() => 'Unknown error')
      toast.push({
        status: 'error',
        title: 'Could not refresh translation',
        description: JSON.stringify(resBody),
        closable: true,
      })
    }

    setState('idle')
  }

  if (TMD === 'loading') return <Spinner />

  const dueDate = jobsMeta?.due || TMD.projectDueDate
  return (
    <TableRow>
      <td>
        <Text size={1}>{getReadableLanguageName(targetLang)}</Text>
      </td>

      <td style={{ minWidth: '200px' }}>
        {jobsMeta && (
          <StatusBadge
            label={jobsMeta.stepName}
            jobStatus={jobsMeta.stepStatus}
            inTable
          />
        )}
      </td>
      <td>
        <Text size={1}>{dueDate ? formatDay(new Date(dueDate)) : ''}</Text>
      </td>
      <td>
        <Flex align="center" gap={1}>
          {jobsMeta?.activeJobUid && (
            <Button
              icon={PhraseMonogram}
              mode="bleed"
              as="a"
              href={getJobEditorURL(jobsMeta.activeJobUid, phraseRegion)}
              target="_blank"
              rel="noopener noreferrer"
              title="Edit in Phrase"
            />
          )}
          <MenuButton
            button={
              <Button padding={2} mode="bleed" icon={EllipsisVerticalIcon} />
            }
            id={`${ptdId || TMD?._id}-${target?._key || ''}-menuButtonOfficial`}
            popover={{ portal: true, tone: 'default' }}
            menu={
              <Menu>
                {schemaType && ptdId && showOpenPTD && (
                  <MenuItem
                    text="Preview"
                    icon={EyeOpenIcon}
                    as="a"
                    href={openInSidePane.getHref(ptdId, schemaType.name)}
                    onClick={(e) => {
                      e.preventDefault()
                      openInSidePane.openImperatively(ptdId, schemaType.name)
                    }}
                  />
                )}
                {ptdId && (
                  <MenuItem
                    text="Refresh Phrase data"
                    icon={RefreshIcon}
                    onClick={handleRefresh}
                    disabled={state !== 'idle'}
                  />
                )}
                {TMD?.sourceDoc?._type && ptdId && (
                  <MenuItem
                    text="Merge translation"
                    icon={PTD ? PublishIcon : Spinner}
                    onClick={handleMerge}
                    disabled={state !== 'idle' || !PTD}
                  />
                )}
              </Menu>
            }
          />
        </Flex>
      </td>
    </TableRow>
  )
}

export function TranslationInfoTable(props: PropsWithChildren<{}>) {
  return (
    <Table>
      <thead>
        <th>
          <Text size={1} weight="semibold">
            Language
          </Text>
        </th>
        <th>
          <Text size={1} weight="semibold" style={{ whiteSpace: 'nowrap' }}>
            Status
          </Text>
        </th>
        <th>
          <Text size={1} weight="semibold">
            Due
          </Text>
        </th>
        <th>
          <Text size={1} weight="semibold">
            <span className="sr-only">Actions</span>
          </Text>
        </th>
      </thead>
      <tbody>{props.children}</tbody>
    </Table>
  )
}
