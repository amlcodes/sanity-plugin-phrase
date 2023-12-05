'use client'

import { Button, Spinner, Text } from '@sanity/ui'
import { useEditState, useSchema } from 'sanity'
import { useOpenInSidePane } from '../../hooks/useOpenInSidepane'
import {
  PtdPhraseMetadata,
  SanityPTD,
  SanityTMD,
  TranslationRequest,
} from '../../types'
import {
  getProjectURL,
  getReadableLanguageName,
  jobIsCancelled,
  jobIsComplete,
  jobsMetadataExtractor,
  langsAreTheSame,
  parseTranslationSnapshot,
} from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import { TranslationInfo, TranslationInfoTable } from './TranslationInfo'

export default function PtdDocDashboard({
  document: ptdDocument,
  ptdMetadata,
}: {
  document: SanityPTD
  ptdMetadata: PtdPhraseMetadata
}) {
  const { phraseRegion } = usePluginOptions()
  const { ready, draft, published } = useEditState(
    ptdDocument?.phraseMetadata?.tmd?._ref || '',
    ptdDocument?.phraseMetadata?.tmd?._type || 'document',
  )
  const TMD = (draft || published) as SanityTMD
  const schema = useSchema()
  const schemaType = schema.get(ptdDocument._type)
  const openInSidePane = useOpenInSidePane(ptdDocument._id)

  if (!ready) {
    return <Spinner />
  }

  if (!TMD) {
    return (
      <DocDashboardCard title="Broken translation">
        <Text>
          This document reached a broken translation state. Please contact
          support.
        </Text>
      </DocDashboardCard>
    )
  }

  const targetLang = ptdMetadata.targetLang
  const sourceDoc: TranslationRequest['sourceDoc'] = {
    _id: TMD.sourceDoc._ref,
    _type: ptdDocument._type,
    _rev: parseTranslationSnapshot(TMD.sourceSnapshot)?._rev || '',
    lang: TMD.sourceLang,
  }
  const target = TMD.targets.find((t) => langsAreTheSame(t.lang, targetLang))

  const SourceDocumentLink = () => {
    const label = `source document in ${getReadableLanguageName(
      TMD.sourceLang,
    )}`
    if (schemaType) {
      return (
        <a
          href={openInSidePane.getHref(sourceDoc._id, schemaType.name)}
          onClick={(e) => {
            e.preventDefault()
            openInSidePane.openImperatively(sourceDoc._id, schemaType.name)
          }}
        >
          {label}
        </a>
      )
    }

    return label
  }

  const TargetDocument = () => {
    if (!schemaType || !target?.targetDoc?._ref) return 'target document'

    return (
      <a
        href={openInSidePane.getHref(target.targetDoc._ref, schemaType.name)}
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
    )
  }

  const jobsMeta =
    target && target?.jobs ? jobsMetadataExtractor(target.jobs) : undefined

  const Subtitle = () => {
    if (jobsMeta && jobIsCancelled({ status: jobsMeta.stepStatus })) {
      return (
        <>
          This content was being translated in Phrase from the{' '}
          <SourceDocumentLink /> to the {getReadableLanguageName(targetLang)}{' '}
          but the job was cancelled.
        </>
      )
    }
    if (jobsMeta && jobIsComplete({ status: jobsMeta.stepStatus })) {
      return (
        <>
          This content was translated in Phrase from the <SourceDocumentLink />{' '}
          to the {getReadableLanguageName(targetLang)} and is now ready to merge
          with the <TargetDocument />.
        </>
      )
    }

    return (
      <>
        This content is being translated in Phrase from the{' '}
        <SourceDocumentLink /> to the {getReadableLanguageName(targetLang)}. You
        can merge its work-in-progress translation with the <TargetDocument />.
      </>
    )
  }

  return (
    <DocDashboardCard
      title="This is a Phrase Translation document"
      subtitle={
        schemaType ? (
          <Text>
            <Subtitle />
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
      <TranslationInfoTable>
        <TranslationInfo
          parentDoc={ptdDocument}
          TMD={TMD}
          paneParentDocId={ptdDocument._id}
          targetLang={ptdMetadata.targetLang}
          showOpenPTD={false}
        />
      </TranslationInfoTable>
    </DocDashboardCard>
  )
}
