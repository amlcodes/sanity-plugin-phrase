import { CloseIcon } from '@sanity/icons'
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
} from '@sanity/ui'
import { useEffect, useState } from 'react'
import { FormField, Path, SchemaType, useClient, useSchema } from 'sanity'
import getAllDocReferences from '../../getAllDocReferences'
import {
  CreateMultipleTranslationsInput,
  CreateTranslationsInput,
  EndpointActionTypes,
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
} from '../../types'
import {
  getDateDaysFromNow,
  getIsoDay,
  getReadableLanguageName,
} from '../../utils'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import { ReferencePreview } from '../ReferencePreview/ReferencePreview'

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
  paths,
  document,
  onCancel,
  sourceLang,
}: {
  paths: Path[]
  document: SanityDocumentWithPhraseMetadata
  onCancel: () => void
  sourceLang: SanityLangCode
}) {
  const {
    translatableTypes,
    supportedTargetLangs,
    phraseTemplates,
    apiEndpoint,
    i18nAdapter,
  } = usePluginOptions()
  const schema = useSchema()
  const [state, setState] = useState<
    'idle' | 'submitting' | 'error' | 'success'
  >('idle')

  const sanityClient = useClient()
  const sourceDocId = document._id

  const [formValue, setFormValue] = useState<FormValue>({
    templateUid: phraseTemplates[0]?.templateUid || '',
    dateDue: getIsoDay(getDateDaysFromNow(14)), // by default, 2 weeks from now
    targetLangs: [],
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

  if (!references) return <Spinner />

  async function handleSubmit() {
    if (validation !== true) return

    setState('submitting')

    const input: CreateMultipleTranslationsInput['translations'] = [
      {
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
      },
      ...Object.entries(references?.chosenDocs || {}).flatMap(
        ([refId, langs]) => {
          const acceptedLangs = langs.filter((l) =>
            formValue.targetLangs.includes(l),
          )
          const doc = references?.refs.find((r) => r.id === refId)
          // If we have a draft, translate that instead
          // @TODO: is this a good UX decision?
          // Will editors know when a piece of content is incomplete in order to finish it before sending for translation?
          const freshDoc = doc?.draft || doc?.published

          if (!freshDoc) return []

          const sourceLangNested = i18nAdapter.getDocumentLang(freshDoc)
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
          }
        },
      ),
    ]
    const res = await fetch(apiEndpoint, {
      body: JSON.stringify({
        action: EndpointActionTypes.CREATE_TRANSLATIONS,
        translations: input,
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      setState('error')
      return
    }
    setState('success')
  }

  return (
    <Stack as="form" space={4}>
      {phraseTemplates.length > 1 && (
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
