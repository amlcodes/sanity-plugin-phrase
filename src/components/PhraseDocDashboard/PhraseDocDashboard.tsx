import { Box, Card, Dialog } from '@sanity/ui'
import { useState } from 'react'
import { StringFieldProps, useFormValue } from 'sanity'
import { i18nAdapter } from '../../adapters'
import { SanityDocumentWithPhraseMetadata, TranslationRequest } from '~/types'
import { langAdapter, undraftId } from '~/utils'
import OngoingTranslationsDocDashboard from './OngoingTranslationsDocDashboard'
import PreviouslyTranslatedDocDashboard from './PreviouslyTranslatedDocDashboard'
import PtdDocDashboard from './PtdDashboard'
import TranslationForm from './TranslationForm'
import UntranslatedDocDashboard from './UntranslatedDocDashboard'

export default function PhraseDocDashboard(props: StringFieldProps) {
  const document = useFormValue([]) as SanityDocumentWithPhraseMetadata
  const [pathsToTranslate, setPathsToTranslate] = useState<
    TranslationRequest['paths'] | null
  >(null)

  const sourceLang = i18nAdapter.getDocumentLang(document)

  if (!document || !sourceLang) return null

  return (
    <Card>
      {(!document.phraseMeta ||
        (document.phraseMeta._type === 'phrase.main.meta' &&
          (!document.phraseMeta.translations ||
            document.phraseMeta.translations.length <= 0))) && (
        <UntranslatedDocDashboard
          document={document}
          openDialog={() => setPathsToTranslate([[]])}
        />
      )}

      {document.phraseMeta &&
        document.phraseMeta._type === 'phrase.ptd.meta' && (
          <PtdDocDashboard
            document={document}
            ptdMetadata={document.phraseMeta}
          />
        )}

      {document.phraseMeta &&
        document.phraseMeta._type === 'phrase.main.meta' &&
        (() => {
          const sourceDoc: TranslationRequest['sourceDoc'] = {
            _id: undraftId(document._id),
            _rev: document._rev,
            _type: document._type,
            lang: langAdapter.sanityToCrossSystem(sourceLang),
          }
          const ongoingTranslations = document.phraseMeta.translations?.filter(
            (translations) => translations.status !== 'COMPLETED',
          )
          if (ongoingTranslations?.length) {
            return (
              <OngoingTranslationsDocDashboard
                ongoingTranslations={ongoingTranslations}
                sourceDoc={sourceDoc}
              />
            )
          }

          return <PreviouslyTranslatedDocDashboard />
        })()}

      {pathsToTranslate && (
        <Dialog
          header="Translate with Phrase"
          onClose={() => setPathsToTranslate(null)}
          zOffset={1000}
          id={`phrase-translation-dialog--${document._id}`}
          width={1}
        >
          <Box padding={4}>
            <TranslationForm
              onCancel={() => setPathsToTranslate(null)}
              document={document}
              paths={pathsToTranslate}
              sourceLang={sourceLang}
            />
          </Box>
        </Dialog>
      )}
    </Card>
  )
}
