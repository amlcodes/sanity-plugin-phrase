import { CheckmarkCircleIcon } from '@sanity/icons'
import { Badge, Card, Flex, Heading, Spinner, Stack, Text } from '@sanity/ui'
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
import {
  CreatedMainDocMetadata,
  PhrasePluginOptions,
  SanityMainDoc,
  SanityTMD,
} from '../../types'
import {
  SANITY_API_VERSION,
  getFieldLabel,
  getReadableLanguageName,
  jobsMetadataExtractor,
  joinPathsByRoot,
} from '../../utils'
import { PhraseLogo } from '../PhraseLogo'
import { PluginOptionsProvider } from '../PluginOptionsContext'

const useOngoingTranslations = createHookFromObservableFactory<
  // Pick<SanityMainDoc, '_id' | '_type' | '_rev' | 'phraseMetadata'>[],
  SanityMainDoc[],
  {
    documentStore: DocumentStore
  } & Pick<PhrasePluginOptions, 'translatableTypes' | 'sourceLang'>
>(({ documentStore, translatableTypes, sourceLang }) => {
  // @TODO: adapter for querying language field
  return documentStore.listenQuery(
    /* groq */ `*[
      _type in $translatableTypes &&
      language == $sourceLang &&
      count(phraseMetadata.translations[status != "COMMITTED"]) > 0
    ]{
      ...,
      _id,
      _type,
      _rev,
      phraseMetadata
    }`,
    { translatableTypes: translatableTypes as string[], sourceLang },
    {
      apiVersion: SANITY_API_VERSION,
    },
  )
})

function OngoingTranslation({
  document,
  translation,
}: {
  document: SanityMainDoc
  translation: CreatedMainDocMetadata
}) {
  const schema = useSchema()
  const schemaType = schema.get(document._type)
  const { ready, draft, published } = useEditState(
    translation.tmd._ref,
    translation.tmd._type,
  )
  const TMD = (draft || published) as SanityTMD

  return (
    <tr>
      {!ready && <Spinner />}
      <Stack as="td" space={2}>
        <Text size={1}>
          {(schemaType && prepareForPreview(document, schemaType)?.title) ||
            `${document._id} (unknown type)`}
        </Text>
        {schemaType && (
          <Stack space={1}>
            {Object.entries(joinPathsByRoot(translation.paths)).map(
              ([rootPath, fullPathsInRoot]) => (
                <Text size={0} key={rootPath}>
                  {getFieldLabel(rootPath, fullPathsInRoot, schemaType)}
                </Text>
              ),
            )}
          </Stack>
        )}
      </Stack>
      <td>
        {ready && TMD && (
          <Stack space={2}>
            {TMD.targets.map((target) => {
              const metadata = jobsMetadataExtractor(target.jobs)
              return (
                <Flex
                  key={target._key}
                  gap={2}
                  style={{ alignItems: 'center' }}
                >
                  <Text style={{ color: 'rgb(24, 49, 34)' }}>
                    <CheckmarkCircleIcon style={{ marginRight: '0.1em' }} />{' '}
                    {getReadableLanguageName(target.lang.sanity)}
                  </Text>
                  <Badge mode="outline" tone="positive">
                    {metadata.stepName}
                  </Badge>
                </Flex>
              )
            })}
          </Stack>
        )}
      </td>
      <td>
        {/* {translation.} */}
        (due date @ToDo)
      </td>
    </tr>
  )
}

export default function createPhraseTool(pluginOptions: PhrasePluginOptions) {
  return function PhraseTool({
    tool,
    ...props
  }: {
    tool: Tool<PhrasePluginOptions>
  }) {
    const documentStore = useDocumentStore()
    const [ongoingTranslations, loading] = useOngoingTranslations({
      documentStore,
      ...pluginOptions,
    })
    return (
      <PluginOptionsProvider pluginOptions={pluginOptions}>
        <Card paddingX={2} paddingY={3}>
          <Stack space={3}>
            <PhraseLogo style={{ maxWidth: '74px' }} />
            <Heading>Ongoing translations</Heading>
            {loading && <Spinner />}
            {!loading && ongoingTranslations && (
              <table>
                <thead>
                  <th>Item</th>
                  <th>Target languages</th>
                  <th>Due</th>
                  <th>Actions</th>
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
                            document={doc}
                            translation={t}
                          />
                        )
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </Stack>
        </Card>
      </PluginOptionsProvider>
    )
  }
}
