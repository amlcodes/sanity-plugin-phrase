'use client'

import { InfoOutlineIcon } from '@sanity/icons'
import { Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui'
import {
  DocumentStore,
  Tool,
  createHookFromObservableFactory,
  prepareForPreview,
  useDocumentStore,
  useSchema,
} from 'sanity'
import { IntentLink } from 'sanity/router'
import { PhrasePluginOptions, SanityTMD } from '../../types'
import {
  SANITY_API_VERSION,
  TMD_TYPE,
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
  SanityTMD[],
  {
    documentStore: DocumentStore
  }
>(({ documentStore }) => {
  return documentStore.listenQuery(
    /* groq */ `*[
      _type == "${TMD_TYPE}" &&
      !(status in ["COMMITTED", "CANCELLED", "DELETED", "FAILED_PERSISTING"])
    ]`,
    {},
    {
      apiVersion: SANITY_API_VERSION,
    },
  )
})

function OngoingTranslation({ TMD }: { TMD: SanityTMD }) {
  const { phraseRegion } = usePluginOptions()
  const schema = useSchema()
  const { sourceDoc } = TMD
  const schemaType = schema.get(sourceDoc._type)

  const dueDate = TMD?.projectDueDate ? new Date(TMD.projectDueDate) : undefined
  return (
    <TableRow>
      <td>
        <Stack space={2}>
          <Text size={1}>
            <IntentLink
              intent="edit"
              params={{ id: sourceDoc._id, type: sourceDoc._type }}
              style={{ textDecoration: 'underline', color: 'currentcolor' }}
            >
              {(schemaType &&
                prepareForPreview(JSON.parse(TMD.sourceSnapshot), schemaType)
                  ?.title) ||
                `${sourceDoc._id} (unknown type)`}
            </IntentLink>
          </Text>
          <TranslationPathsDisplay {...TMD} />
        </Stack>
      </td>
      <td>
        <Stack space={2}>
          {TMD.targets.map((target) => {
            if (!target.jobs) return null

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
      </td>
      <td>
        <Text size={1}>{dueDate ? formatDay(dueDate) : 'N/A'}</Text>
      </td>
      <td>
        {TMD.phraseProjectUid && (
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
                      {ongoingTranslations.map((TMD) => (
                        <OngoingTranslation key={TMD._id} TMD={TMD} />
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
