import { Path } from '@sanity/types'
import { sanityClient } from './sanityClient'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
} from './types'

export default async function lockDocument({
  pathKey,
  translationName,
  path,
  freshDocuments,
}: {
  pathKey: string
  translationName: string
  path: Path
  freshDocuments: SanityTranslationDocPair[]
}) {
  const transaction = sanityClient.transaction()
  const docs = freshDocuments.flatMap(
    (d) =>
      [d.draft, d.published].filter(
        Boolean,
      ) as SanityDocumentWithPhraseMetadata[],
  )

  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => {
      const basePatch = patch.setIfMissing({ phraseTranslations: [] })
      const phraseMetadata = {
        _type: 'phrase.mainDoc.meta',
        _key: pathKey,
        projectName: translationName,
        path,
        status: 'CREATING',
      }

      if (doc.phraseTranslations?.some((t) => t._key === pathKey)) {
        return basePatch.insert(
          'replace',
          `phraseTranslations[_key == "${pathKey}"]`,
          [phraseMetadata],
        )
      }
      return basePatch.append('phraseTranslations', [phraseMetadata])
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
