'use client'

import { FilterIcon, InfoOutlineIcon } from '@sanity/icons'
import { Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui'
import { useState } from 'react'
import {
  DocumentStore,
  collate,
  createHookFromObservableFactory,
  useDocumentStore,
  useSchema,
} from 'sanity'
import { PhrasePluginOptions, SanityMainDoc } from '../../types'
import { NOT_PTD, SANITY_API_VERSION } from '../../utils'
import { DocumentPreview } from '../DocumentPreview/DocumentPreview'
import { usePluginOptions } from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import { SearchInput } from './SearchInput'

const useTranslatableDocuments = createHookFromObservableFactory<
  // Pick<SanityMainDoc, '_id' | '_type' | '_rev' | 'phraseMetadata'>[],
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

export default function IssueNewTranslations() {
  const schema = useSchema()
  const pluginOptions = usePluginOptions()
  const documentStore = useDocumentStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTypes, setFilteredTypes] = useState<string[]>([])
  const [documents, documentsLoading] = useTranslatableDocuments({
    documentStore,
    searchQuery,
    filteredTypes,
    ...pluginOptions,
  })
  const collatedDocuments =
    documents && documents.length > 0 ? collate(documents) : []

  return (
    <Stack space={4}>
      <Heading as="h2" size={2}>
        Issue new translations
      </Heading>
      <Text size={2}>
        Select eligible documents to request translations in bulk.
      </Text>
      <Flex gap={3} justify="space-between">
        <SearchInput
          loading={documentsLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <Button
          text={
            filteredTypes.length ? `${filteredTypes.length} types` : 'All types'
          }
          iconRight={FilterIcon}
          fontSize={2}
          padding={2}
          // @TODO
          // eslint-disable-next-line no-alert
          onClick={() => alert('DEV: not yet implemented')}
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
            <DocumentPreview
              key={docPair.id}
              schemaType={schema.get(docPair.type)}
              docPair={docPair}
            />
          ))}
        <Card padding={4} border radius={2} tone="critical">
          <Flex gap={3} align="flex-start">
            <Text size={2}>
              <InfoOutlineIcon />
            </Text>
            {/* @TODO: implement bulk request */}
            <Text size={2}>
              DEV: The UI for listing and requesting missing translations is not
              yet ready
            </Text>
          </Flex>
        </Card>
      </Stack>
    </Stack>
  )
}
