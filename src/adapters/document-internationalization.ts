import { KeyedObject, Reference } from 'sanity'
import { uuid } from '@sanity/uuid'
import { DocPairFromAdapter, I18nAdapter, ReferenceMap } from '../types'
import { draftId, isDraft, undraftId } from '../utils'

// @TODO make configurable
const languageField = 'language'
const weakReferences = true

// https://github.com/sanity-io/document-internationalization/blob/main/src/constants.ts
const METADATA_SCHEMA_NAME = `translation.metadata`
const TRANSLATIONS_ARRAY_NAME = `translations`

type TranslationReference = KeyedObject & {
  _type: 'internationalizedArrayReferenceValue'
  value: Reference
}

export const documentInternationalizationAdapter: I18nAdapter = {
  injectDocumentLang: (document, language) => ({
    ...document,
    [languageField]: language,
  }),
  getTranslatedReferences: async ({
    sanityClient,
    references,
    targetLanguage,
  }) => {
    // @TODO: finish getting reference map - not sure how to get translation.metadata of drafts 🤔
    // Using previewDrafts for now for simplicity
    const fetched = await sanityClient
      .withConfig({ perspective: 'previewDrafts' })
      .fetch<{ _id: string; _type: string; translation?: Reference }[]>(
        /* groq */ `*[_id in $ids] {
      _id,
      _type,
      "translation": *[_type == "translation.metadata" && references(^._id)]
        [0].${TRANSLATIONS_ARRAY_NAME}[_key == $targetLanguage][0].value,
    }`,
        {
          ids: references.map((ref) => undraftId(ref)),
          targetLanguage,
        },
      )

    return references.reduce((refMap, ref) => {
      const refDoc = fetched.find((doc) => doc._id === undraftId(ref))

      if (!refDoc) {
        return {
          ...refMap,
          [ref]: 'doc-not-found',
        }
      }

      // @TODO: make configurable
      const TRANSLATABLE_TYPES = ['post']
      if (!TRANSLATABLE_TYPES.includes(refDoc._type)) {
        return {
          ...refMap,
          [ref]: 'untranslatable',
        }
      }

      return {
        ...refMap,
        [ref]: {
          targetLanguageDocId: refDoc.translation?._ref || null,
          _type: refDoc._type,
          state: 'both', // @TODO how to?
        },
      }
    }, {} as ReferenceMap)
  },
  getDocumentLang: (document) => (document?.[languageField] as string) || null,
  getOrCreateTranslatedDocuments: async (props) => {
    const { sanityClient, sourceDoc } = props
    const fetched = await sanityClient.fetch<
      | {
          _id: string
          _type: typeof METADATA_SCHEMA_NAME
          translations: DocPairFromAdapter[]
        }
      | DocPairFromAdapter
    >(
      /* groq */ `
  coalesce(
    // For documents with translations, fetch the translations metadata
    *[_type == $metadataType && references($publishedId)][0] {
      _id,
      _type,
      "translations": ${TRANSLATIONS_ARRAY_NAME}[] {
        "lang": _key,
        "published": value->,
        "draft": *[_id == ("drafts." + ^.value._ref)][0],
      }
    },
    // Otherwise, fetch the document itself and handle its draft & published states
    *[_id == $publishedId][0]{
      "lang": ${languageField},
      "published": @,
      "draft": *[_id == $draftId][0],
    },
    *[_id == $draftId][0]{
      "lang": ${languageField},
      "published": null,
      "draft": @,
    },
  )
  `,
      {
        publishedId: undraftId(sourceDoc._id),
        draftId: draftId(sourceDoc._id),
        metadataType: METADATA_SCHEMA_NAME,
      },
    )

    if (!fetched) throw new Error('Failed fetching fresh documents')

    const metaDocument =
      '_type' in fetched && fetched._type === 'translation.metadata'
        ? fetched
        : undefined
    const allInitialDocuments = metaDocument
      ? metaDocument.translations
          // As translations in meta document are weak references, they might be null
          .filter((t) => !!(t.draft || t.published)?._id)
      : [fetched as DocPairFromAdapter]

    const freshSourcePair = allInitialDocuments.find(
      (doc) => doc.lang === sourceDoc.lang.sanity,
    )

    const freshDocToCopy = isDraft(sourceDoc._id)
      ? freshSourcePair?.draft || freshSourcePair?.published
      : freshSourcePair?.published || freshSourcePair?.draft

    if (!freshDocToCopy) {
      throw new Error('Failed fetching fresh source document')
    }

    const langsMissingTranslation = props.targetLangs.flatMap((lang) => {
      if (
        allInitialDocuments.some(
          (doc) =>
            doc.lang === lang.sanity && !!(doc.draft || doc.published)?._id,
        )
      ) {
        return []
      }

      const publishedId = uuid()
      return {
        lang,
        publishedId,
        doc: {
          ...freshDocToCopy,
          _id: draftId(publishedId),
          [languageField]: lang.sanity,
        },
      }
    })

    if (!langsMissingTranslation.length) {
      return allInitialDocuments
    }

    const transaction = props.sanityClient.transaction()

    /**
     * Creates the translated documents for the missing languages
     * @see `handleCreate` at https://github.com/sanity-io/document-internationalization/blob/main/src/components/LanguageOption.tsx#L59
     */
    langsMissingTranslation.forEach(({ doc }) => {
      transaction.create(doc)
    })

    const sourceReference = createTranslationReference(
      sourceDoc.lang.sanity,
      sourceDoc._id,
      sourceDoc._type,
      !weakReferences,
    )
    const newTranslationsReferences = langsMissingTranslation.map((t) =>
      createTranslationReference(
        t.lang.sanity,
        t.publishedId,
        sourceDoc._type,
        !weakReferences,
      ),
    )

    /**
     * Associates the new translations with the source document via the meta document
     * @see `handleCreate` at https://github.com/sanity-io/document-internationalization/blob/main/src/components/LanguageOption.tsx#L98
     */
    if (metaDocument) {
      transaction.patch(metaDocument._id, (patch) =>
        patch.insert('after', 'translations[-1]', newTranslationsReferences),
      )
    } else {
      transaction.create({
        _id: uuid(),
        _type: METADATA_SCHEMA_NAME,
        [TRANSLATIONS_ARRAY_NAME]: [
          sourceReference,
          ...newTranslationsReferences,
        ],
        schemaTypes: [sourceDoc._type],
      })
    }

    await transaction.commit()

    const finalDocuments: DocPairFromAdapter[] = [
      ...allInitialDocuments,
      ...langsMissingTranslation.map(({ doc, lang }) => ({
        lang: lang.sanity,
        draft: doc,
        published: null,
      })),
    ]

    return finalDocuments
  },
  langAdapter: {
    toPhrase: (sanityLang) => sanityLang.replace(/_/g, '-'),
    toSanity: (phraseLang) => phraseLang.replace(/-/g, '_'),
  },
}

/**
 * Adapted from https://github.com/sanity-io/document-internationalization/blob/main/src/utils/createReference.ts
 */
function createTranslationReference(
  key: string,
  ref: string,
  type: string,
  strengthenOnPublish: boolean = true,
): TranslationReference {
  return {
    _key: key,
    _type: 'internationalizedArrayReferenceValue',
    value: {
      _type: 'reference',
      _ref: undraftId(ref),
      _weak: true,
      // If the user has configured weakReferences, we won't want to strengthen them
      ...(strengthenOnPublish ? { _strengthenOnPublish: { type } } : {}),
    },
  }
}
