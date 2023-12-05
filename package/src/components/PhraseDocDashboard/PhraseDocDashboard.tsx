'use client'

import { Box, Card, Dialog, Stack } from '@sanity/ui'
import { useState } from 'react'
import { StringFieldProps, useFormValue } from 'sanity'
import {
  CrossSystemLangCode,
  PhrasePluginOptions,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '../../types'
import {
  isPTDDoc,
  isTranslatedMainDoc,
  isTranslationCommitted,
  targetLangsIntersect,
} from '../../utils'
import { PluginOptionsProvider } from '../PluginOptionsContext'
import OngoingTranslationsDocDashboard from './OngoingTranslationsDocDashboard'
import PreviouslyTranslatedDocDashboard from './PreviouslyTranslatedDocDashboard'
import PtdDocDashboard from './PtdDashboard'
import TranslationForm from './TranslationForm'
import UntranslatedDocDashboard from './UntranslatedDocDashboard'

export default function getPhraseDocDashboard(
  pluginOptions: PhrasePluginOptions,
) {
  return function PhraseDocDashboard(_props: StringFieldProps) {
    const document = useFormValue([]) as SanityDocumentWithPhraseMetadata
    const [toTranslate, setToTranslate] = useState<{
      paths: TranslationRequest['paths']
      targetLangs?: CrossSystemLangCode[]
    } | null>(null)

    const docLang = pluginOptions.i18nAdapter.getDocumentLang(document)

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
                openDialog={() => setToTranslate({ paths: [[]] })}
              />
            )}

          {isTranslatedMainDoc(document) &&
            (() => {
              const ongoingTranslations =
                document.phraseMetadata.translations?.filter(
                  (t) => !isTranslationCommitted(t),
                ) || []
              const langsNotOngoing = pluginOptions.supportedTargetLangs.filter(
                (supportedLang) =>
                  !ongoingTranslations.some(
                    (t) =>
                      'targetLangs' in t &&
                      targetLangsIntersect(t.targetLangs, [supportedLang]),
                  ),
              )

              return (
                <Stack space={3}>
                  {ongoingTranslations.length > 0 && (
                    <OngoingTranslationsDocDashboard
                      ongoingTranslations={ongoingTranslations}
                      document={document}
                    />
                  )}
                  {langsNotOngoing.length > 0 && (
                    <PreviouslyTranslatedDocDashboard
                      docLang={docLang}
                      document={document}
                      setToTranslate={setToTranslate}
                    />
                  )}
                </Stack>
              )
            })()}

          {toTranslate && (
            <Dialog
              header="Translate with Phrase"
              onClose={() => setToTranslate(null)}
              zOffset={1000}
              id={`phrase-translation-dialog--${document._id}`}
              width={1}
            >
              <Box padding={4}>
                <TranslationForm
                  onCancel={() => setToTranslate(null)}
                  document={document}
                  toTranslate={toTranslate}
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
