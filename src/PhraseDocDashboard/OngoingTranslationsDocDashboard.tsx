import { Path } from '@sanity/types'
import { Button, Card, Flex, Heading, Stack } from '@sanity/ui'
import { useDocumentStore } from 'sanity'
import {
  CrossSystemLangCode,
  MainDocTranslationMetadata,
  TranslationRequest,
} from '../types'
import { getPathsLabel, getProjectURL, getPtdId, usePtdState } from '../utils'
import { TranslationInfo } from './TranslationInfo'

export default function OngoingTranslationsDocDashboard(props: {
  ongoingTranslations: MainDocTranslationMetadata[]
  sourceDoc: TranslationRequest['sourceDoc']
}) {
  return (
    <Card padding={4} border radius={1}>
      <Heading as="h2">This document has translations in progress</Heading>
      <Stack space={4} marginTop={4}>
        {props.ongoingTranslations.map((translation) => {
          if (translation.status === 'COMPLETED') return null

          if (translation.status === 'CREATING')
            return (
              <div key={translation._key}>
                Project being created in Phrase for{' '}
                {translation.paths.map((p) => `[${p.join(', ')}]`).join(', ')}
              </div>
            )

          return (
            <OngoingTranslationCard
              key={translation._key}
              translation={translation}
              sourceDoc={props.sourceDoc}
            />
          )
        })}
      </Stack>
    </Card>
  )
}

function OngoingTranslationCard({
  translation,
  sourceDoc,
}: {
  sourceDoc: TranslationRequest['sourceDoc']
  translation: MainDocTranslationMetadata
}) {
  if (translation.status !== 'CREATED') return null

  return (
    <Card padding={3} border>
      <Stack space={4}>
        <Flex align="center" gap={2}>
          <Heading size={1} as="h3" style={{ flex: 1 }}>
            {getPathsLabel(translation.paths)}
          </Heading>
          <Button
            size={1}
            as="a"
            href={getProjectURL(
              translation.projectUid,
              // @TODO: make configurable
              'us',
            )}
            target="_blank"
            rel="noopener noreferrer"
            mode="ghost"
            text="Project in Phrase"
          />
        </Flex>

        {translation.targetLangs.map((targetLang) => (
          <TranslationInfoInSourceDoc
            key={targetLang.sanity}
            paths={translation.paths}
            sourceDoc={{ ...sourceDoc, _rev: translation.sourceDocRev }}
            targetLang={targetLang}
          />
        ))}
      </Stack>
    </Card>
  )
}
export function TranslationInfoInSourceDoc({
  targetLang,
  paths,
  sourceDoc,
}: {
  targetLang: CrossSystemLangCode
  paths: Path[]
  sourceDoc: TranslationRequest['sourceDoc']
}) {
  const ptdId = getPtdId({
    targetLang: targetLang,
    paths: paths,
    sourceDoc,
  })
  const documentStore = useDocumentStore()
  const [ptdMetadata, metadataIsLoading] = usePtdState({
    documentStore,
    ptdId,
  })

  return (
    <TranslationInfo
      ptdMetadata={metadataIsLoading ? 'loading' : ptdMetadata}
      paneParentDocId={sourceDoc._id}
      sourceDoc={sourceDoc}
      paths={paths}
      targetLang={targetLang}
    />
  )
}
