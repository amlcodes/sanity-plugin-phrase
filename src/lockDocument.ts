import { sanityClient } from './sanityClient'
import {
  MainDocTranslationMetadata,
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { getTranslationKey, getTranslationName } from './utils'

export default async function lockDocument(
  props: TranslationRequest & {
    freshDocuments: SanityTranslationDocPair[]
  },
) {
  const { paths, freshDocuments, sourceDoc } = props
  const { name: translationName, filename } = getTranslationName(props)
  const translationKey = getTranslationKey(paths, sourceDoc._rev)

  const transaction = sanityClient.transaction()
  const docs = freshDocuments.flatMap(
    (d) =>
      [d.draft, d.published].filter(
        Boolean,
      ) as SanityDocumentWithPhraseMetadata[],
  )

  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => {
      patch.setIfMissing({
        phraseMeta: {
          _type: 'phrase.main.meta',
          translations: [],
        },
      } as Pick<SanityDocumentWithPhraseMetadata, 'phraseMeta'>)

      const translationMetadata: MainDocTranslationMetadata = {
        _type: 'phrase.mainDoc.translation',
        _key: translationKey,
        _createdAt: new Date().toISOString(),
        sourceDocRev: props.sourceDoc._rev,
        projectName: translationName,
        filename,
        paths,
        status: 'CREATING',
      }
      if (
        doc.phraseMeta?._type === 'phrase.main.meta' &&
        doc.phraseMeta.translations?.some((t) => t._key === translationKey)
      ) {
        return patch.insert(
          'replace',
          `phraseMeta.translations[_key == "${translationKey}"]`,
          [translationMetadata],
        )
      }
      return patch.append('phraseMeta.translations', [translationMetadata])
    })
  }

  try {
    await transaction.commit()
  } catch (error) {
    throw new Error(`Failed to lock document, preventing action on Phrase.`, {
      cause: error,
    })
  }
}
