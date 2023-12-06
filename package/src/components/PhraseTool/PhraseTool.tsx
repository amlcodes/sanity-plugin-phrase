'use client'

import { InfoOutlineIcon } from '@sanity/icons'
import { Button, Card, Flex, Heading, Spinner, Stack, Text } from '@sanity/ui'
import React from 'react'
import {
  DocumentStore,
  Tool,
  createHookFromObservableFactory,
  prepareForPreview,
  useDocumentStore,
  useEditState,
  useSchema,
} from 'sanity'
import { IntentLink } from 'sanity/router'
import {
  CreatedMainDocMetadata,
  PhrasePluginOptions,
  SanityMainDoc,
  SanityTMD,
} from '../../types'
import {
  SANITY_API_VERSION,
  formatDay,
  getProjectURL,
  jobsMetadataExtractor,
} from '../../utils'
import { PhraseLogo, PhraseMonogram } from '../PhraseLogo'
import {
  PluginOptionsProvider,
  usePluginOptions,
} from '../PluginOptionsContext'
import SpinnerBox from '../SpinnerBox'
import StatusBadge from '../StatusBadge'
import { StyledTable, TableRow } from '../StyledTable'
import { TranslationPathsDisplay } from '../TranslationPathsDisplay'
import IssueNewTranslations from './IssueNewTranslations'

const useOngoingTranslations = createHookFromObservableFactory<
  // Pick<SanityMainDoc, '_id' | '_type' | '_rev' | 'phraseMetadata'>[],
  SanityMainDoc[],
  {
    documentStore: DocumentStore
  } & Pick<
    PhrasePluginOptions,
    'translatableTypes' | 'sourceLang' | 'i18nAdapter'
  >
>(({ documentStore, translatableTypes, sourceLang, i18nAdapter }) => {
  return documentStore.listenQuery(
    /* groq */ `*[
      _type in $translatableTypes &&
      ${i18nAdapter.getLangGROQFilter(sourceLang)} &&
      count(phraseMetadata.translations[status != "COMMITTED"]) > 0
    ]`,
    { translatableTypes: translatableTypes as string[], sourceLang },
    {
      apiVersion: SANITY_API_VERSION,
    },
  )
})

function OngoingTranslation({
  currentDocument,
  translation,
}: {
  currentDocument: SanityMainDoc
  translation: CreatedMainDocMetadata
}) {
  const { phraseRegion } = usePluginOptions()
  const schema = useSchema()
  const schemaType = schema.get(currentDocument._type)
  const { ready, draft, published } = useEditState(
    translation.tmd._ref,
    translation.tmd._type,
  )
  const TMD = (draft || published) as SanityTMD

  const dueDate =
    ready && TMD?.projectDueDate ? new Date(TMD.projectDueDate) : undefined
  return (
    <TableRow>
      <td>
        <Stack space={2}>
          <Text size={1}>
            <IntentLink
              intent="edit"
              params={{ id: currentDocument._id, type: currentDocument._type }}
              style={{ textDecoration: 'underline', color: 'currentcolor' }}
            >
              {(schemaType &&
                prepareForPreview(currentDocument, schemaType)?.title) ||
                `${currentDocument._id} (unknown type)`}
            </IntentLink>
          </Text>
          <TranslationPathsDisplay {...translation} />
        </Stack>
      </td>
      <td>
        {ready && TMD ? (
          <Stack space={2}>
            {TMD.targets.map((target) => {
              const metadata = jobsMetadataExtractor(target.jobs)
              return (
                <StatusBadge
                  key={target._key}
                  jobStatus={metadata.stepStatus}
                  label={metadata.stepName}
                  language={target.lang.sanity}
                />
              )
            })}
          </Stack>
        ) : (
          <Spinner />
        )}
      </td>
      <td>
        <Text size={1}>{dueDate ? formatDay(dueDate) : 'N/A'}</Text>
      </td>
      <td>
        {ready && TMD ? (
          <Flex align="center" gap={2}>
            <Button
              as="a"
              href={getProjectURL(TMD.phraseProjectUid, phraseRegion)}
              target="_blank"
              rel="noopener noreferrer"
              title="Project in Phrase"
              mode="bleed"
              iconRight={PhraseMonogram}
            />
          </Flex>
        ) : (
          <Spinner />
        )}
      </td>
    </TableRow>
  )
}

export default function createPhraseTool(pluginOptions: PhrasePluginOptions) {
  return function PhraseTool({ tool }: { tool: Tool<PhrasePluginOptions> }) {
    const documentStore = useDocumentStore()
    const [ongoingTranslations, loading] = useOngoingTranslations({
      documentStore,
      ...pluginOptions,
    })
    return (
      <PluginOptionsProvider pluginOptions={pluginOptions}>
        <Card padding={4}>
          <Flex align="flex-start" gap={4}>
            <Stack space={3} style={{ maxWidth: '1000px' }} flex={1}>
              <PhraseLogo style={{ maxWidth: '74px' }} />
              <Heading>Ongoing translations</Heading>
              {loading && <SpinnerBox />}
              {!loading &&
                (!ongoingTranslations || ongoingTranslations.length === 0) && (
                  <Card padding={4} border radius={2} tone="primary">
                    <Flex gap={3} align="flex-start">
                      <Text size={2}>
                        <InfoOutlineIcon />
                      </Text>
                      <Text size={2} weight="semibold">
                        No ongoing translations
                      </Text>
                    </Flex>
                  </Card>
                )}
              {!loading &&
                ongoingTranslations &&
                ongoingTranslations.length > 0 && (
                  <StyledTable>
                    <thead>
                      <th>
                        <Text size={1} weight="semibold">
                          Document
                        </Text>
                      </th>
                      <th>
                        <Text size={1} weight="semibold">
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
                      {ongoingTranslations.map((doc) => (
                        <React.Fragment key={doc._id}>
                          {doc.phraseMetadata.translations?.map((t) => {
                            if (
                              t.status === 'COMMITTED' ||
                              t.status === 'CREATING' ||
                              t.status === 'DELETED' ||
                              t.status === 'FAILED_PERSISTING'
                            )
                              return null

                            return (
                              <OngoingTranslation
                                key={t._key}
                                currentDocument={doc}
                                translation={t}
                              />
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </StyledTable>
                )}
            </Stack>
            <IssueNewTranslations />
          </Flex>
        </Card>
      </PluginOptionsProvider>
    )
  }
}
