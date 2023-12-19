'use client'

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
  useToast,
} from '@sanity/ui'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { FormField, Schema, SchemaType, useClient, useSchema } from 'sanity'
import type { CreateTranslationsResponse } from '../../createTranslation/createMultipleTranslations'
import getAllDocReferences from '../../getAllDocReferences'
import useDebounce from '../../hooks/useDebounce'
import getStaleTranslations, {
  isTargetStale,
} from '../../staleTranslations/getStaleTranslations'
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
  SANITY_API_VERSION,
  getDateDaysFromNow,
  getFieldLabel,
  getIsoDay,
  getReadableLanguageName,
  getTranslationName,
  joinDiffsByRoot,
  langsAreTheSame,
  semanticListItems,
  targetLangsIntersect,
} from '../../utils'
import { FULL_DOC_DIFF_PATH, joinLangsByDiffs } from '../../utils/paths'
import { PhraseMonogram } from '../PhraseLogo'
import { usePluginOptions } from '../PluginOptionsContext'
import { ReferencePreview } from '../ReferencePreview/ReferencePreview'
import SpinnerBox from '../SpinnerBox'
import StatusBadge from '../StatusBadge'

type FormValue = Pick<
  CreateTranslationsInput,
  'templateUid' | 'dateDue' | 'targetLangs'
>

type ChosenDocLangState = {
  lang: SanityLangCode
  diffs: StaleTargetStatus['diffs']
}

type ReferencesState = {
  documentId: string
  refs: Awaited<ReturnType<typeof getAllDocReferences>>
  chosenDocs: Record<string, ChosenDocLangState[]>
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
  currentDocument,
  onCancel,
  sourceLang,
  toTranslate: { diffs, targetLangs: desiredTargetLangs },
}: {
  currentDocument: SanityDocumentWithPhraseMetadata
  onCancel: () => void
  sourceLang: SanityLangCode
  toTranslate: {
    diffs: TranslationRequest['diffs']
    targetLangs?: CrossSystemLangCode[]
  }
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

  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
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
      diffs: (diffs.length > 0 ? diffs : [[]]) as TranslationRequest['diffs'],
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
      const { body, status } = await submitMultipleTranslations({
        schema,
        currentDocument: currentDocument,
        formValue,
        diffs: diffs,
        sourceLang,
        sourceDocId,
        references,
        pluginOptions,
      })

      if (status === 401 || body.error === 'InvalidPhraseCredentialsError') {
        toast.push({
          status: 'error',
          title: 'Invalid Phrase credentials',
          description:
            'Request help from developers to properly authenticate this plugin with Phrase.',
        })
        setState('error')
        return
      }

      if (
        body.error === 'SanityFetchError' ||
        body.error === 'SanityCreateOrReplaceError'
      ) {
        toast.push({
          status: 'error',
          title: 'The Sanity API responded with an error',
          description:
            'Either the server is down or its Sanity credentials are wrong',
        })
        setState('error')
        return
      }

      if (!('successes' in body)) {
        toast.push({
          status: 'error',
          title: body.error,
          description:
            'errors' in body ? JSON.stringify(body.errors) : undefined,
        })
        setState('error')
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
            Object.entries(joinDiffsByRoot(diffs)).map(
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
              {references.refs.map((reference) => (
                <ReferenceCheckbox
                  key={reference.id}
                  reference={reference}
                  referencesState={references}
                  currentDocument={currentDocument}
                  formValue={formValue}
                  setReferences={setReferences}
                />
              ))}
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
          icon={state === 'submitting' ? Spinner : PhraseMonogram}
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

function ReferenceCheckbox({
  reference,
  formValue,
  currentDocument,
  referencesState,
  setReferences,
}: {
  reference: ReferencesState['refs'][number]
  formValue: FormValue
  currentDocument: SanityDocumentWithPhraseMetadata
  referencesState: ReferencesState
  setReferences: Dispatch<SetStateAction<ReferencesState | undefined>>
}) {
  const schema = useSchema()

  const staleness = referencesState.staleness?.find(
    (r) => r.sourceDoc?._id === reference.id,
  )
  const availableTargets = (staleness?.targets || []).filter(
    (t) =>
      !('error' in t) &&
      (t.status === StaleStatus.STALE ||
        t.status === StaleStatus.UNTRANSLATED) &&
      targetLangsIntersect(formValue.targetLangs, [t.lang]),
  )
  const chosenLangs = referencesState.chosenDocs?.[reference.id] || []
  const allToggleState = (() => {
    if (availableTargets.length === 0) return 'disabled'

    if (availableTargets.length === chosenLangs.length) return 'checked'

    if (chosenLangs.length === 0) return 'unchecked'

    return 'indeterminate'
  })()

  return (
    <Card border padding={3}>
      <Stack space={2}>
        <ReferencePreview
          reference={{
            _ref: reference.id,
            _type: reference.type,
          }}
          parentDocId={currentDocument._id}
          schemaType={schema.get(reference.type) as SchemaType}
          referenceOpen={false}
        />

        <Flex gap={3} align="flex-start">
          <Flex
            gap={2}
            align="center"
            as="label"
            id={`${reference.id}-all-toggle-label`}
          >
            <Checkbox
              name="referencedDocuments"
              id={`${reference.id}-all-toggle`}
              disabled={allToggleState === 'disabled'}
              checked={allToggleState === 'checked'}
              indeterminate={allToggleState === 'indeterminate'}
              onInput={(e) => {
                e.preventDefault()
                if (allToggleState === 'disabled') return

                if (allToggleState === 'checked') {
                  setReferences({
                    ...referencesState,
                    chosenDocs: {
                      ...(referencesState.chosenDocs || {}),
                      [reference.id]: [],
                    },
                  })
                  return
                }

                const newLangs = availableTargets.map(
                  (target): ChosenDocLangState => ({
                    lang: target.lang.sanity,
                    diffs: isTargetStale(target)
                      ? target.diffs
                      : [FULL_DOC_DIFF_PATH],
                  }),
                )

                setReferences({
                  ...referencesState,
                  chosenDocs: {
                    ...(referencesState.chosenDocs || {}),
                    [reference.id]: newLangs,
                  },
                })
              }}
            />
            <Text>All</Text>
          </Flex>
          <Flex flex={1} gap={3} align="center" wrap="wrap">
            {formValue.targetLangs.map((lang) => {
              const langStaleness = staleness?.targets.find((t) =>
                langsAreTheSame(t.lang, lang),
              )
              const canTranslate = availableTargets?.some((l) =>
                langsAreTheSame(l.lang, lang),
              )
              const included =
                referencesState.chosenDocs?.[reference.id]?.some(
                  (l) => l.lang === lang,
                ) || false
              return (
                <Flex gap={2} align="center" key={lang} as="label">
                  <Checkbox
                    name="referencedDocuments"
                    id={`${reference.id}-${lang}`}
                    style={{ display: 'block' }}
                    disabled={!canTranslate}
                    checked={included}
                    onChange={(e) => {
                      if (!staleness || !langStaleness) return

                      const checked = e.currentTarget.checked

                      const refLangs =
                        referencesState.chosenDocs?.[reference.id] || []
                      const newLangs = ((): typeof refLangs => {
                        if (checked) {
                          return included
                            ? refLangs
                            : [
                                ...refLangs,
                                {
                                  lang,
                                  diffs:
                                    langStaleness &&
                                    isTargetStale(langStaleness)
                                      ? langStaleness.diffs
                                      : [FULL_DOC_DIFF_PATH],
                                },
                              ]
                        }

                        return refLangs.filter(
                          // eslint-disable-next-line
                          (l) => l.lang !== lang,
                        )
                      })()
                      setReferences({
                        ...referencesState,
                        chosenDocs: {
                          ...(referencesState.chosenDocs || {}),
                          [reference.id]: newLangs,
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
        </Flex>
      </Stack>
    </Card>
  )
}

async function submitMultipleTranslations({
  currentDocument,
  formValue,
  diffs,
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
  diffs: TranslationRequest['diffs']
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
    diffs: diffs,
  }
  const input: CreateMultipleTranslationsInput['translations'] = [
    {
      ...MAIN,
      translationName: getTranslationName({
        diffs: MAIN.diffs,
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

        const joinedByDiff = joinLangsByDiffs(acceptedLangs)

        return Object.values(joinedByDiff).map((byDiff) => {
          return {
            sourceDoc,
            dateDue: formValue.dateDue,
            templateUid: formValue.templateUid,
            targetLangs: byDiff.langs,
            diffs: byDiff.diffs,
            translationName: getTranslationName({
              diffs: byDiff.diffs,
              targetLangs: byDiff.langs,
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

  return {
    body: (await res.json()) as CreateTranslationsResponse['body'],
    status: res.status as CreateTranslationsResponse['status'],
  }
}
