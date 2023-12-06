'use client'

import { CloseIcon, InfoOutlineIcon } from '@sanity/icons'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Select,
  Spinner,
  Stack,
  Text,
  TextInput,
  useToast,
} from '@sanity/ui'
import { useCallback, useEffect, useState } from 'react'
import {
  FormField,
  Path,
  Schema,
  SchemaType,
  useClient,
  useSchema,
} from 'sanity'
import type { CreateTranslationsResponse } from '../../createTranslation/createMultipleTranslations'
import getAllDocReferences from '../../getAllDocReferences'
import useDebounce from '../../hooks/useDebounce'
import getStaleTranslations, {
  isTargetStale,
} from '../../staleTranslations/getStaleTranslations'
import { joinLangsByPath } from '../../utils/paths'
import {
  CreateMultipleTranslationsInput,
  CreateTranslationsInput,
  CrossSystemLangCode,
  EndpointActionTypes,
  PhrasePluginOptions,
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
  StaleResponse,
  StaleStatus,
  StaleTargetStatus,
  TranslationRequest,
} from '../../types'
import {
  getDateDaysFromNow,
  getFieldLabel,
  getIsoDay,
  getReadableLanguageName,
  getTranslationName,
  joinPathsByRoot,
  langsAreTheSame,
  semanticListItems,
} from '../../utils'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import { ReferencePreview } from '../ReferencePreview/ReferencePreview'
import SpinnerBox from '../SpinnerBox'
import StatusBadge from '../StatusBadge'

type FormValue = Pick<
  CreateTranslationsInput,
  'templateUid' | 'dateDue' | 'targetLangs'
>

type ReferencesState = {
  documentId: string
  refs: Awaited<ReturnType<typeof getAllDocReferences>>
  chosenDocs: Record<
    string,
    {
      lang: SanityLangCode
      paths: StaleTargetStatus['changedPaths']
    }[]
  >
  staleness?: StaleResponse[]
  stalenessHash?: string
}

function validateFormValue(formValue: FormValue) {
  if (!formValue.templateUid) {
    return 'Phrase project template is required'
  }

  if (!formValue.targetLangs.length) {
    return 'Choose at least one target language'
  }

  if (!formValue.dateDue || new Date(formValue.dateDue) < new Date()) {
    return 'A future due date is required'
  }

  return true
}

export default function TranslationForm({
  toTranslate: { paths, targetLangs: desiredTargetLangs },
  currentDocument,
  onCancel,
  sourceLang,
}: {
  toTranslate: { paths: Path[]; targetLangs?: CrossSystemLangCode[] }
  currentDocument: SanityDocumentWithPhraseMetadata
  onCancel: () => void
  sourceLang: SanityLangCode
}) {
  const toast = useToast()
  const pluginOptions = usePluginOptions()
  const { translatableTypes, supportedTargetLangs, phraseTemplates } =
    pluginOptions
  const schema = useSchema()
  const sourceDocSchema = schema.get(currentDocument._type)
  const [state, setState] = useState<
    'idle' | 'submitting' | 'error' | 'success'
  >('idle')

  const sanityClient = useClient()
  const sourceDocId = currentDocument._id

  const [formValue, setFormValue] = useState<FormValue>({
    templateUid: phraseTemplates[0]?.templateUid || '',
    dateDue: getIsoDay(getDateDaysFromNow(14)), // by default, 2 weeks from now
    targetLangs: desiredTargetLangs?.map((l) => l.sanity) || [],
  })

  const [references, setReferences] = useState<undefined | ReferencesState>(
    undefined,
  )
  const freshReferencesHash = references?.documentId
    ? `${references.documentId}-${references.refs.map((r) => r.id).join('-')}`
    : undefined
  const debouncedReferencesHash = useDebounce(freshReferencesHash, 1000)
  const stalenessReloading =
    !!freshReferencesHash &&
    !!references?.staleness &&
    references.stalenessHash !== freshReferencesHash

  const getStaleness = useCallback(
    async function getStaleness() {
      if (!references?.refs) return

      const staleness = await getStaleTranslations({
        sourceDocs: references.refs.flatMap((ref) => {
          const freshest = ref.draft || ref.published
          const lang =
            freshest && pluginOptions.i18nAdapter.getDocumentLang(freshest)

          if (!freshest || !lang) return []

          return {
            _id: ref.id,
            _rev: freshest._rev,
            _type: ref.type,
            lang: pluginOptions.langAdapter.sanityToCrossSystem(lang),
          }
        }),
        sanityClient,
        pluginOptions,
        targetLangs: supportedTargetLangs,
      })

      setReferences((prev) => {
        if (!prev) return prev

        return {
          ...prev,
          staleness,
          stalenessHash: freshReferencesHash,
        }
      })
    },
    [
      sanityClient,
      pluginOptions,
      supportedTargetLangs,
      setReferences,
      references,
      freshReferencesHash,
    ],
  )

  useEffect(
    () => {
      if (debouncedReferencesHash) getStaleness()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedReferencesHash],
  )

  async function refreshReferences() {
    const newRefs = await getAllDocReferences({
      sanityClient,
      document: currentDocument,
      translatableTypes,
      paths: (paths.length > 0 ? paths : [[]]) as TranslationRequest['paths'],
    })

    setReferences({ documentId: sourceDocId, refs: newRefs, chosenDocs: {} })
  }

  useEffect(
    () => {
      if (references?.documentId === sourceDocId) return

      refreshReferences()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceDocId],
  )

  const validation = validateFormValue(formValue)

  if (!references) return <SpinnerBox />

  async function handleSubmit() {
    if (validation !== true) return

    setState('submitting')

    try {
      const body = await submitMultipleTranslations({
        schema,
        currentDocument: currentDocument,
        formValue,
        paths,
        sourceLang,
        sourceDocId,
        references,
        pluginOptions,
      })

      if (!('successes' in body)) {
        toast.push({
          status: 'error',
          title: body.error,
          description: JSON.stringify(body.errors),
        })
        return
      }

      setState('success')
      onCancel()
      if ('errors' in body) {
        toast.push({
          status: 'warning',
          title: body.message,
          description: JSON.stringify(body.errors),
        })
      } else {
        toast.push({
          status: 'success',
          title: body.message,
        })
      }
    } catch (error) {
      setState('error')
      toast.push({
        status: 'error',
        title: 'Something went wrong',
      })
    }
  }

  const langsConfigurable =
    !desiredTargetLangs || desiredTargetLangs.length === 0
  const templateConfigurable = phraseTemplates.length > 1

  return (
    <Stack as="form" space={4}>
      {!langsConfigurable && desiredTargetLangs && (
        <Stack space={3} flex={1}>
          <Text size={1} weight="semibold">
            Requesting translations for{' '}
            {semanticListItems(
              desiredTargetLangs.map((lang) => getReadableLanguageName(lang)),
            )}
          </Text>
          {sourceDocSchema &&
            Object.entries(joinPathsByRoot(paths)).map(
              ([rootPath, fullPathsInRoot]) => (
                <Text key={rootPath} size={1} muted>
                  {getFieldLabel(rootPath, fullPathsInRoot, sourceDocSchema)}
                </Text>
              ),
            )}
        </Stack>
      )}
      {templateConfigurable && (
        <FormField title="Phrase project template" inputId="phraseTemplate">
          <Select
            padding={3}
            fontSize={2}
            id="phraseTemplate"
            value={formValue.templateUid}
            defaultValue={undefined}
            onChange={(e) =>
              setFormValue({
                ...formValue,
                templateUid: e.currentTarget.value,
              })
            }
          >
            <option value="">Choose one of the available templates</option>
            {phraseTemplates.map((template) => (
              <option key={template.templateUid} value={template.templateUid}>
                {template.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <FormField title="Translation due" inputId="dateDue">
        <TextInput
          type="date"
          padding={3}
          fontSize={2}
          id="dateDue"
          value={formValue.dateDue}
          onChange={(e) =>
            setFormValue({
              ...formValue,
              dateDue: e.currentTarget.value,
            })
          }
        />
      </FormField>
      {langsConfigurable && (
        <FormField title="Target languages">
          <Stack space={2} paddingLeft={1}>
            {supportedTargetLangs.map((lang) => (
              <Flex align="center" as="label" key={lang}>
                <Checkbox
                  name="targetLanguages"
                  id={lang}
                  style={{ display: 'block' }}
                  checked={formValue.targetLangs.includes(lang)}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked

                    const targetLangs = ((): typeof formValue.targetLangs => {
                      if (checked) {
                        return formValue.targetLangs.includes(lang)
                          ? formValue.targetLangs
                          : [...formValue.targetLangs, lang]
                      }

                      return formValue.targetLangs.filter((l) => l !== lang)
                    })()

                    setFormValue({
                      ...formValue,
                      targetLangs,
                    })
                  }}
                />
                <Box flex={1} paddingLeft={3}>
                  <Text>{getReadableLanguageName(lang)}</Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </FormField>
      )}
      {formValue.targetLangs.length > 0 ? (
        <FormField
          title="Referenced documents to translate"
          description="Documents with up-to-date translations can't be re-translated"
        >
          {stalenessReloading && (
            <Card padding={4} border radius={2} tone="primary">
              <Flex gap={3} align="flex-start">
                <Spinner />
                <Text size={2} weight="semibold">
                  Re-analyzing changed content...
                </Text>
              </Flex>
            </Card>
          )}
          {references.refs.length > 0 ? (
            <Stack space={3}>
              {desiredTargetLangs && desiredTargetLangs.length > 0 && (
                <Card padding={4} border radius={2} tone="critical">
                  <Flex gap={3} align="flex-start">
                    <Text size={2}>
                      <InfoOutlineIcon />
                    </Text>
                    {/* @TODO: remove this */}
                    <Text size={2}>
                      DEV: References selection for previously translated
                      documents is broken ATM.
                    </Text>
                  </Flex>
                </Card>
              )}
              {references.refs.map((ref) => {
                const staleness = references.staleness?.find(
                  (r) => r.sourceDoc?._id === ref.id,
                )
                return (
                  <Stack key={ref.id} space={2}>
                    <ReferencePreview
                      reference={{
                        _ref: ref.id,
                        _type: ref.type,
                      }}
                      parentDocId={currentDocument._id}
                      schemaType={schema.get(ref.type) as SchemaType}
                      referenceOpen={false}
                    />

                    <Flex gap={3} align="center">
                      {formValue.targetLangs.map((lang) => {
                        const langStaleness = staleness?.targets.find((t) =>
                          langsAreTheSame(t.lang, lang),
                        )
                        const canTranslate =
                          !!staleness &&
                          !!langStaleness &&
                          !('error' in langStaleness) &&
                          (langStaleness.status === StaleStatus.STALE ||
                            langStaleness.status === StaleStatus.UNTRANSLATED)
                        const included =
                          references.chosenDocs?.[ref.id]?.some(
                            (l) => l.lang === lang,
                          ) || false
                        return (
                          <Flex gap={2} align="center" key={lang} as="label">
                            <Checkbox
                              name="referencedDocuments"
                              id={`${ref.id}-${lang}`}
                              style={{ display: 'block' }}
                              disabled={!canTranslate}
                              checked={included}
                              onChange={(e) => {
                                if (!staleness || !langStaleness) return

                                const checked = e.currentTarget.checked

                                const refLangs =
                                  references.chosenDocs?.[ref.id] || []
                                const newLangs = ((): typeof refLangs => {
                                  if (checked) {
                                    return included
                                      ? refLangs
                                      : [
                                          ...refLangs,
                                          {
                                            lang,
                                            paths:
                                              langStaleness &&
                                              isTargetStale(langStaleness)
                                                ? langStaleness.changedPaths
                                                : [[]],
                                          },
                                        ]
                                  }

                                  return refLangs.filter(
                                    // eslint-disable-next-line
                                    (l) => l.lang !== lang,
                                  )
                                })()
                                setReferences({
                                  ...references,
                                  chosenDocs: {
                                    ...(references.chosenDocs || {}),
                                    [ref.id]: newLangs,
                                  },
                                })
                              }}
                            />
                            <Text>{getReadableLanguageName(lang)}</Text>
                            {langStaleness && 'error' in langStaleness
                              ? 'Failed fetching'
                              : langStaleness && (
                                  <StatusBadge
                                    label={langStaleness.status}
                                    staleStatus={langStaleness.status}
                                  />
                                )}
                          </Flex>
                        )
                      })}
                    </Flex>
                  </Stack>
                )
              })}
            </Stack>
          ) : (
            <Card tone="transparent" border radius={2} padding={3}>
              <Text muted>No references found in selected content</Text>
            </Card>
          )}
        </FormField>
      ) : (
        <Card tone="transparent" border radius={2} padding={3}>
          <Text muted>Choose 1 or more target languages</Text>
        </Card>
      )}
      <Flex gap={2} align="center">
        <Button
          text="Cancel"
          icon={CloseIcon}
          onClick={onCancel}
          disabled={state === 'submitting'}
          mode="ghost"
          style={{ flex: 1 }}
        />
        <Button
          text="Send to Phrase"
          icon={PhraseMonogram}
          tone="primary"
          disabled={
            validation !== true ||
            state === 'submitting' ||
            !references ||
            !references.staleness ||
            !!stalenessReloading
          }
          onClick={handleSubmit}
          mode="ghost"
          style={{ flex: 1 }}
        />
      </Flex>
      {validation !== true && (
        <Card padding={3} border radius={2} tone="caution">
          <Text>{validation}</Text>
        </Card>
      )}
    </Stack>
  )
}

async function submitMultipleTranslations({
  currentDocument,
  formValue,
  paths,
  sourceLang,
  sourceDocId,
  references,
  schema,
  pluginOptions,
}: {
  schema: Schema
  pluginOptions: PhrasePluginOptions
  currentDocument: SanityDocumentWithPhraseMetadata
  formValue: FormValue
  paths: Path[]
  sourceLang: SanityLangCode
  sourceDocId: string
  references?: ReferencesState
}) {
  const MAIN: Omit<
    CreateMultipleTranslationsInput['translations'][number],
    'translationName'
  > = {
    sourceDoc: {
      _id: sourceDocId,
      _rev: currentDocument._rev,
      _type: currentDocument._type,
      lang: sourceLang,
    },
    targetLangs: formValue.targetLangs,
    templateUid: formValue.templateUid,
    dateDue: formValue.dateDue,
    paths,
  }
  const input: CreateMultipleTranslationsInput['translations'] = [
    {
      ...MAIN,
      translationName: getTranslationName({
        paths: MAIN.paths,
        sourceDoc: MAIN.sourceDoc,
        targetLangs: MAIN.targetLangs,
        freshDoc: currentDocument,
        schemaType: schema.get(currentDocument._type),
      }),
    },
    ...Object.entries(references?.chosenDocs || {}).flatMap(
      ([refId, byLangs]) => {
        const acceptedLangs = Object.values(byLangs).filter((l) =>
          formValue.targetLangs.includes(l.lang),
        )

        const doc = references?.refs.find((r) => r.id === refId)

        // If we have a draft, translate that instead
        const freshDoc = doc?.draft || doc?.published

        if (!freshDoc) return []

        const sourceLangNested =
          pluginOptions.i18nAdapter.getDocumentLang(freshDoc)
        if (!sourceLangNested) return []

        const sourceDoc: CreateTranslationsInput['sourceDoc'] = {
          _id: freshDoc._id,
          _rev: freshDoc?._rev,
          _type: doc.type,
          lang: sourceLangNested,
        }

        const joinedByPath = joinLangsByPath(acceptedLangs)

        return Object.values(joinedByPath).map((byPath) => {
          return {
            sourceDoc,
            dateDue: formValue.dateDue,
            templateUid: formValue.templateUid,
            targetLangs: byPath.langs,
            paths: byPath.paths,
            translationName: getTranslationName({
              paths,
              targetLangs: byPath.langs,
              sourceDoc,
              freshDoc,
              schemaType: schema.get(currentDocument._type),
            }),
          }
        })
      },
    ),
  ]
  const res = await fetch(pluginOptions.apiEndpoint, {
    body: JSON.stringify({
      action: EndpointActionTypes.CREATE_TRANSLATIONS,
      translations: input,
    }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return (await res.json()) as CreateTranslationsResponse['body']
}
