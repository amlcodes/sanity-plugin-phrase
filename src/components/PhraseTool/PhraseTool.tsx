import { Card, Heading, Spinner, Stack, Text } from '@sanity/ui'
import React, { useEffect, useRef, useState } from 'react'
import {
  DocumentStore,
  Tool,
  createHookFromObservableFactory,
  prepareForPreview,
  useDocumentStore,
  useEditState,
  useSchema,
} from 'sanity'
import styled from 'styled-components'
import {
  CreatedMainDocMetadata,
  PhrasePluginOptions,
  SanityMainDoc,
  SanityTMD,
} from '../../types'
import {
  SANITY_API_VERSION,
  getFieldLabel,
  jobsMetadataExtractor,
  joinPathsByRoot,
} from '../../utils'
import { PhraseLogo } from '../PhraseLogo'
import { PluginOptionsProvider } from '../PluginOptionsContext'
import StatusBadge from '../StatusBadge'

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

function getTallestCell(rowEl: HTMLTableRowElement) {
  const cells = Array.from(
    rowEl.querySelectorAll('td'),
  ) as HTMLTableCellElement[]
  return cells.reduce((tallest, cell) => {
    const contentsHeight = cell.children?.[0]?.getBoundingClientRect().height

    return contentsHeight > tallest ? contentsHeight : tallest
  }, 0)
}

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
  const rowRef = useRef<HTMLTableRowElement>(null)
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const rowEl = rowRef.current
    if (!rowEl) return undefined

    setRowHeight(getTallestCell(rowEl))
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!(entry instanceof HTMLTableRowElement)) return

        setRowHeight(getTallestCell(entry))
      }
    })

    resizeObserver.observe(rowEl)

    return () => {
      resizeObserver.unobserve(rowEl)
    }
  }, [])

  return (
    <tr
      ref={rowRef}
      style={
        {
          '--row-height': rowHeight ? `${rowHeight}px` : undefined,
        } as any
      }
    >
      {!ready && <Spinner />}
      <td>
        <Stack space={2}>
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
      </td>
      <td>
        {ready && TMD && (
          <Stack space={2}>
            {TMD.targets.map((target) => {
              const metadata = jobsMetadataExtractor(target.jobs)
              return (
                <StatusBadge
                  key={target._key}
                  status={metadata.stepStatus}
                  step={metadata.stepName}
                  language={target.lang.sanity}
                />
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

const StyledTable = styled.table`
  border-collapse: collapse;
  border-spacing: 0;

  th,
  td {
    text-align: left;
    padding: 0.75em 0.875em;
    border-bottom: 1px solid var(--card-shadow-outline-color);
  }
  td {
    height: var(--row-height, 100%);
  }
`

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
              <StyledTable>
                <thead>
                  <th>
                    <Text size={1} weight="semibold">
                      Item
                    </Text>
                  </th>
                  <th>
                    <Text size={1} weight="semibold">
                      Target languages
                    </Text>
                  </th>
                  <th>
                    <Text size={1} weight="semibold">
                      Due
                    </Text>
                  </th>
                  <th>
                    <Text size={1} weight="semibold">
                      Actions
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
                            document={doc}
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
        </Card>
      </PluginOptionsProvider>
    )
  }
}
