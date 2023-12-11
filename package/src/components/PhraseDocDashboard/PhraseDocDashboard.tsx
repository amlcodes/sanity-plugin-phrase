'use client'

import { Box, Card, Dialog, Stack } from '@sanity/ui'
import { useState } from 'react'
import { StringFieldProps, useDocumentStore, useFormValue } from 'sanity'
import { useTMDs } from '../../hooks/useTMDs'
import {
  CrossSystemLangCode,
  PhrasePluginOptions,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '../../types'
import {
  FULL_DOC_DIFF_PATH,
  isMainDoc,
  isPTDDoc,
  isTranslationCommitted,
  langsAreTheSame,
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
    const documentStore = useDocumentStore()
    const [TMDs, TMDsLoading] = useTMDs({
      documentStore,
      docId: currentDocument._id,
    })
    const [toTranslate, setToTranslate] = useState<{
      diffs: TranslationRequest['diffs']
      targetLangs?: CrossSystemLangCode[]
    } | null>(null)

    const docLang = pluginOptions.i18nAdapter.getDocumentLang(currentDocument)

    const isTranslatedMainDoc =
      (isMainDoc(currentDocument) && TMDs && TMDs.length > 0) || false
    const isUntranslatedMainDoc =
      isMainDoc(currentDocument) && !isTranslatedMainDoc

    if (
      !currentDocument ||
      TMDsLoading ||
      !docLang ||
      // Don't show anything for target langs with no translations - source will show UntranslatedDocDashboard
      (isUntranslatedMainDoc && docLang !== pluginOptions.sourceLang)
    )
      return null

    return (
      <PluginOptionsProvider pluginOptions={pluginOptions}>
        <Card>
          {isPTDDoc(currentDocument) && (
            <PtdDocDashboard currentDocument={currentDocument} />
          )}

          {isUntranslatedMainDoc && (
            <UntranslatedDocDashboard
              currentDocument={currentDocument}
              openDialog={() => setToTranslate({ diffs: [FULL_DOC_DIFF_PATH] })}
            />
          )}

          {isTranslatedMainDoc &&
            TMDs &&
            (() => {
              const ongoingTranslations =
                TMDs.filter((t) => !isTranslationCommitted(t)) || []
              const langsNotOngoing = pluginOptions.supportedTargetLangs.filter(
                (supportedLang) =>
                  !ongoingTranslations.some(
                    (TMD) =>
                      'targets' in TMD &&
                      // eslint-disable-next-line
                      TMD.targets.some((t) =>
                        langsAreTheSame(t.lang, supportedLang),
                      ),
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
                      TMDs={TMDs}
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
                  TMDs={TMDs || []}
                />
              </Box>
            </Dialog>
          )}
        </Card>
      </PluginOptionsProvider>
    )
  }
}
