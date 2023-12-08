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
  FULL_DOC_DIFF_PATH,
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
    const currentDocument = useFormValue([]) as SanityDocumentWithPhraseMetadata
    const [toTranslate, setToTranslate] = useState<{
      diffs: TranslationRequest['diffs']
      targetLangs?: CrossSystemLangCode[]
    } | null>(null)

    const docLang = pluginOptions.i18nAdapter.getDocumentLang(currentDocument)

    const isUntranslatedMainDoc =
      !isPTDDoc(currentDocument) && !isTranslatedMainDoc(currentDocument)
    if (
      !currentDocument ||
      !docLang ||
      // Don't show anything for target langs with no translations - source will show UntranslatedDocDashboard
      (isUntranslatedMainDoc && docLang !== pluginOptions.sourceLang)
    )
      return null

    return (
      <PluginOptionsProvider pluginOptions={pluginOptions}>
        <Card>
          {isPTDDoc(currentDocument) && (
            <PtdDocDashboard
              currentDocument={currentDocument}
              ptdMetadata={currentDocument.phraseMetadata}
            />
          )}

          {!isPTDDoc(currentDocument) &&
            !isTranslatedMainDoc(currentDocument) &&
            docLang === pluginOptions.sourceLang && (
              <UntranslatedDocDashboard
                currentDocument={currentDocument}
                openDialog={() =>
                  setToTranslate({ diffs: [FULL_DOC_DIFF_PATH] })
                }
              />
            )}

          {isTranslatedMainDoc(currentDocument) &&
            (() => {
              const ongoingTranslations =
                currentDocument.phraseMetadata.translations?.filter(
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
                      currentDocument={currentDocument}
                    />
                  )}
                  {langsNotOngoing.length > 0 && (
                    <PreviouslyTranslatedDocDashboard
                      docLang={docLang}
                      currentDocument={currentDocument}
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
              id={`phrase-translation-dialog--${currentDocument._id}`}
              width={1}
            >
              <Box padding={4}>
                <TranslationForm
                  onCancel={() => setToTranslate(null)}
                  currentDocument={currentDocument}
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
