'use client'

import { CloseIcon } from '@sanity/icons'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Select,
  Stack,
  Text,
  TextInput,
  useToast,
} from '@sanity/ui'
import { useEffect, useState } from 'react'
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
import {
  CreateMultipleTranslationsInput,
  CreateTranslationsInput,
  CrossSystemLangCode,
  EndpointActionTypes,
  PhrasePluginOptions,
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
} from '../../types'
import {
  getDateDaysFromNow,
  getFieldLabel,
  getIsoDay,
  getReadableLanguageName,
  getTranslationName,
  joinPathsByRoot,
  semanticListItems,
} from '../../utils'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import { ReferencePreview } from '../ReferencePreview/ReferencePreview'
import SpinnerBox from '../SpinnerBox'

type FormValue = Pick<
  CreateTranslationsInput,
  'templateUid' | 'dateDue' | 'targetLangs'
>

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
  document,
  onCancel,
  sourceLang,
}: {
  toTranslate: { paths: Path[]; targetLangs?: CrossSystemLangCode[] }
  document: SanityDocumentWithPhraseMetadata
  onCancel: () => void
  sourceLang: SanityLangCode
}) {
  const toast = useToast()
  const pluginOptions = usePluginOptions()
  const { translatableTypes, supportedTargetLangs, phraseTemplates } =
    pluginOptions
  const schema = useSchema()
  const sourceDocSchema = schema.get(document._type)
  const [state, setState] = useState<
    'idle' | 'submitting' | 'error' | 'success'
  >('idle')

  const sanityClient = useClient()
  const sourceDocId = document._id

  const [formValue, setFormValue] = useState<FormValue>({
    templateUid: phraseTemplates[0]?.templateUid || '',
    dateDue: getIsoDay(getDateDaysFromNow(14)), // by default, 2 weeks from now
    targetLangs: desiredTargetLangs?.map((l) => l.sanity) || [],
  })

  const [references, setReferences] = useState<
    | undefined
    | {
        documentId: string
        refs: Awaited<ReturnType<typeof getAllDocReferences>>
        chosenDocs: Record<string, FormValue['targetLangs']>
      }
  >(undefined)

  async function refreshReferences() {
    const newRefs = await getAllDocReferences({
      sanityClient,
      document,
      translatableTypes,
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
        document,
        formValue,
        paths,
        sourceLang,
        sourceDocId,
        references,
        pluginOptions,
      })

      if (body.status !== 200) {
        // @TODO error management
        toast.push({
          status: 'error',
          title: 'Something went wrong',
          description: JSON.stringify(body),
        })
        return
      }

      setState('success')
      onCancel()
      toast.push({
        status: 'success',
        title: 'Translations requested',
      })
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
              desiredTargetLangs.map((lang) =>
                getReadableLanguageName(lang.sanity),
              ),
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
        <FormField title="Referenced documents to translate">
          {references.refs.length > 0 ? (
            <Stack space={3}>
              {references.refs.map((ref) => (
                <Stack key={ref.id} space={2}>
                  <ReferencePreview
                    reference={{
                      _ref: ref.id,
                      _type: ref.type,
                    }}
                    parentDocId={document._id}
                    schemaType={schema.get(ref.type) as SchemaType}
                    referenceOpen={false}
                  />
                  {!desiredTargetLangs?.length && (
                    <Flex gap={3} align="center">
                      {formValue.targetLangs.map((lang) => (
                        <Flex gap={2} align="center" key={lang} as="label">
                          <Checkbox
                            name="referencedDocuments"
                            id={`${ref.id}-${lang}`}
                            style={{ display: 'block' }}
                            checked={
                              references.chosenDocs?.[ref.id]?.includes(lang) ||
                              false
                            }
                            onChange={(e) => {
                              const checked = e.currentTarget.checked

                              const refLangs =
                                references.chosenDocs?.[ref.id] || []
                              const newLangs = ((): typeof refLangs => {
                                if (checked) {
                                  return refLangs.includes(lang)
                                    ? refLangs
                                    : [...refLangs, lang]
                                }

                                // eslint-disable-next-line
                                return refLangs.filter((l) => l !== lang)
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
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Card tone="transparent" border radius={2} padding={3}>
              <Text muted>No references found</Text>
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
          disabled={validation !== true || state === 'submitting'}
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
  document,
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
  document: SanityDocumentWithPhraseMetadata
  formValue: FormValue
  paths: Path[]
  sourceLang: SanityLangCode
  sourceDocId: string
  references?: {
    refs: Awaited<ReturnType<typeof getAllDocReferences>>
    chosenDocs: Record<string, FormValue['targetLangs']>
  }
}) {
  const MAIN: Omit<
    CreateMultipleTranslationsInput['translations'][number],
    'translationName'
  > = {
    sourceDoc: {
      _id: sourceDocId,
      _rev: document._rev,
      _type: document._type,
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
        freshDoc: document,
        schemaType: schema.get(document._type),
      }),
    },
    ...Object.entries(references?.chosenDocs || {}).flatMap(
      ([refId, langs]) => {
        const acceptedLangs = langs.filter((l) =>
          formValue.targetLangs.includes(l),
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

        return {
          sourceDoc,
          targetLangs: acceptedLangs,
          templateUid: formValue.templateUid,
          dateDue: formValue.dateDue,
          paths,
          translationName: getTranslationName({
            paths,
            targetLangs: acceptedLangs,
            sourceDoc,
            freshDoc,
            schemaType: schema.get(document._type),
          }),
        }
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

  return (await res.json()).body as CreateTranslationsResponse
}
