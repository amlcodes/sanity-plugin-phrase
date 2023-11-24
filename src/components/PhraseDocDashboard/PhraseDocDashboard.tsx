import { Box, Card, Dialog } from '@sanity/ui'
import { useState } from 'react'
import { StringFieldProps, useFormValue } from 'sanity'
import { i18nAdapter } from '../../adapters'
import {
  PhrasePluginOptions,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '../../types'
import {
  isPTDDoc,
  isTranslatedMainDoc,
  isTranslationCommitted,
  langAdapter,
  undraftId,
} from '../../utils'
import OngoingTranslationsDocDashboard from './OngoingTranslationsDocDashboard'
import PreviouslyTranslatedDocDashboard from './PreviouslyTranslatedDocDashboard'
import PtdDocDashboard from './PtdDashboard'
import TranslationForm from './TranslationForm'
import UntranslatedDocDashboard from './UntranslatedDocDashboard'
import { PluginOptionsProvider } from '../PluginOptionsContext'

export default function getPhraseDocDashboard(
  pluginOptions: PhrasePluginOptions,
) {
  return function PhraseDocDashboard(props: StringFieldProps) {
    const document = useFormValue([]) as SanityDocumentWithPhraseMetadata
    const [pathsToTranslate, setPathsToTranslate] = useState<
      TranslationRequest['paths'] | null
    >(null)

    const docLang = i18nAdapter.getDocumentLang(document)

    const isUntranslatedMainDoc =
      !isPTDDoc(document) && !isTranslatedMainDoc(document)
    if (
      !document ||
      !docLang ||
      // Don't show anything for target langs with no translations - source will show UntranslatedDocDashboard
      (isUntranslatedMainDoc && docLang !== pluginOptions.sourceLang)
    )
      return null

    return (
      <PluginOptionsProvider pluginOptions={pluginOptions}>
        <Card>
          {isPTDDoc(document) && (
            <PtdDocDashboard
              document={document}
              ptdMetadata={document.phraseMetadata}
            />
          )}

          {!isPTDDoc(document) &&
            !isTranslatedMainDoc(document) &&
            docLang === pluginOptions.sourceLang && (
              <UntranslatedDocDashboard
                document={document}
                openDialog={() => setPathsToTranslate([[]])}
              />
            )}

          {isTranslatedMainDoc(document) &&
            (() => {
              const sourceDoc: TranslationRequest['sourceDoc'] = {
                _id: undraftId(document._id),
                _rev: document._rev,
                _type: document._type,
                lang: langAdapter.sanityToCrossSystem(docLang),
              }
              const ongoingTranslations =
                document.phraseMetadata.translations?.filter(
                  (t) => !isTranslationCommitted(t),
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
                  sourceLang={docLang}
                />
              </Box>
            </Dialog>
          )}
        </Card>
      </PluginOptionsProvider>
    )
  }
}
