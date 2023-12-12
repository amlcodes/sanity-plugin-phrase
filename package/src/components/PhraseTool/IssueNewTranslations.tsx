'use client'

import { EyeOpenIcon, InfoOutlineIcon } from '@sanity/icons'
import { Button, Card, Checkbox, Flex, Heading, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import {
  CollatedHit,
  DocumentStore,
  SanityDocument,
  collate,
  createHookFromObservableFactory,
  useDocumentStore,
  useSchema,
} from 'sanity'
import {
  PhrasePluginOptions,
  SanityMainDoc,
  SanityTMD,
  StaleStatus,
} from '../../types'
import {
  NOT_PTD,
  SANITY_API_VERSION,
  draftId,
  getProjectURL,
  undraftId,
} from '../../utils'
import { DocumentPreview } from '../DocumentPreview/DocumentPreview'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import { SearchInput } from './SearchInput'
import StatusBadge from '../StatusBadge'
import { IntentLink } from 'sanity/router'
import { PhraseMonogram } from '../PhraseLogo'

const useTranslatableDocuments = createHookFromObservableFactory<
  SanityMainDoc[],
  {
    documentStore: DocumentStore
    searchQuery: string
    filteredTypes: string[]
  } & Pick<
    PhrasePluginOptions,
    'translatableTypes' | 'sourceLang' | 'i18nAdapter'
  >
>(
  ({
    documentStore,
    searchQuery,
    filteredTypes,
    translatableTypes,
    sourceLang,
    i18nAdapter,
  }) => {
    return documentStore.listenQuery(
      /* groq */ `*[
      _type in $translatableTypes &&
      ${NOT_PTD} &&
      ${searchQuery ? 'title match $searchQuery &&' : ''}
      ${filteredTypes.length ? '_type in $filteredTypes &&' : ''}
      ${i18nAdapter.getLangGROQFilter(sourceLang)}
    ]`,
      {
        translatableTypes: translatableTypes as string[],
        sourceLang,
        searchQuery,
        filteredTypes,
      },
      {
        apiVersion: SANITY_API_VERSION,
      },
    )
  },
)

function DocumentForTranslation({
  docPair,
  ongoingTMD,
  selected,
  selectDocument,
}: {
  docPair: CollatedHit<SanityDocument>
  ongoingTMD: SanityTMD | undefined
  selected: boolean
  selectDocument: (selected: boolean) => void
}) {
  const pluginOptions = usePluginOptions()
  const schema = useSchema()
  return (
    <Flex gap={3} align="center">
      <Flex gap={2} align="center" as="label" flex={1}>
        <Checkbox
          name="chosenDocuments"
          id={`request-translations-${docPair.id}`}
          style={{ display: 'block' }}
          disabled={!!ongoingTMD}
          checked={selected}
          onChange={(e) => selectDocument(e.currentTarget.checked)}
        />
        <DocumentPreview
          key={docPair.id}
          schemaType={schema.get(docPair.type)}
          docPair={docPair}
          openOnClick={false}
        />
      </Flex>
      <Flex align="center" gap={2}>
        {ongoingTMD && (
          <StatusBadge
            label="Ongoing"
            staleStatus={StaleStatus.ONGOING}
            badgeProps={{ style: { minWidth: '100px' } }}
          />
        )}
        <Button
          as={IntentLink}
          data-as="a"
          // @ts-expect-error
          intent="edit"
          params={{ id: docPair.id, type: docPair.type }}
          title="Open document"
          icon={EyeOpenIcon}
          mode="bleed"
          fontSize={1}
          padding={2}
        />
        {ongoingTMD?.phraseProjectUid && (
          <Button
            title="Project in Phrase"
            as="a"
            href={getProjectURL(
              ongoingTMD.phraseProjectUid,
              pluginOptions.phraseRegion,
            )}
            icon={PhraseMonogram}
            mode="bleed"
            fontSize={1}
            padding={2}
          />
        )}
      </Flex>
    </Flex>
  )
}

export default function IssueNewTranslations(props: {
  ongoingTMDs: SanityTMD[] | undefined
}) {
  const pluginOptions = usePluginOptions()
  const documentStore = useDocumentStore()
  const [searchQuery, setSearchQuery] = useState('')

  // UI for types not yet implemented
  const [filteredTypes] = useState<string[]>([])

  const [documents, documentsLoading] = useTranslatableDocuments({
    documentStore,
    searchQuery,
    filteredTypes,
    ...pluginOptions,
  })
  const collatedDocuments =
    documents && documents.length > 0 ? collate(documents) : []
  const [selectedDocuments, setSelectedDocuments] = useState<
    typeof collatedDocuments
  >([])

  if (documentsLoading) return <SpinnerBox />

  return (
    <Stack space={4} paddingTop={3}>
      <Heading as="h2" size={2}>
        Issue new translations
      </Heading>
      <Text size={2}>
        Select eligible documents to request translations in bulk.
      </Text>
      <Flex
        gap={3}
        justify="space-between"
        style={{
          position: 'sticky',
          top: '0.5rem',
          background: 'var(--card-bg-color)',
        }}
      >
        <SearchInput
          loading={documentsLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <Button
          disabled={selectedDocuments.length === 0}
          text={
            selectedDocuments.length
              ? `Request ${selectedDocuments.length} translation${
                  selectedDocuments.length > 1 ? 's' : ''
                }`
              : 'Request translations'
          }
          icon={PhraseMonogram}
          tone="primary"
        />
      </Flex>
      <Stack space={3}>
        {documentsLoading && <SpinnerBox />}
        {!documentsLoading && collatedDocuments.length === 0 && (
          <Card padding={3} radius={2} shadow={1} tone="primary">
            <Flex align="center" gap={3}>
              <InfoOutlineIcon />
              <Text>No documents found.</Text>
            </Flex>
          </Card>
        )}
        {!documentsLoading &&
          collatedDocuments.length > 0 &&
          collatedDocuments.map((docPair) => (
            <DocumentForTranslation
              key={docPair.id}
              docPair={docPair}
              ongoingTMD={
                props.ongoingTMDs?.find((TMD) =>
                  [
                    TMD.sourceRef._ref,
                    ...(TMD.targets || []).map(
                      (target) => target.targetDoc._ref,
                    ),
                  ]
                    .flatMap((id) => [undraftId(id), draftId(id)])
                    .includes(docPair.id),
                ) || undefined
              }
              selected={selectedDocuments.some((d) => d.id === docPair.id)}
              selectDocument={(selected) => {
                setSelectedDocuments((prev) =>
                  selected
                    ? [...prev, docPair]
                    : prev.filter((d) => d.id !== docPair.id),
                )
              }}
            />
          ))}
      </Stack>
    </Stack>
  )
}
