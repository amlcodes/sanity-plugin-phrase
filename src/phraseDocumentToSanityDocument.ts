import { SanityClient } from 'sanity'
import { ContentInPhrase, SanityPTDWithExpandedMetadata } from './types'
import { i18nAdapter } from './adapters'
import { modifyDocInPath } from './mergeDocs'
import phraseToSanity from './phraseToSanity'
import { dedupeArray, stringToPath } from './utils'
import { parseAllReferences } from './utils/references'

export default async function phraseDocumentToSanityDocument({
  contentInPhrase,
  freshPTD,
  sanityClient,
  translatableTypes,
}: {
  contentInPhrase: ContentInPhrase
  freshPTD: SanityPTDWithExpandedMetadata
  sanityClient: SanityClient
  translatableTypes: string[]
}): Promise<typeof freshPTD> {
  let finalDoc = JSON.parse(JSON.stringify(freshPTD)) as typeof freshPTD

  const references = dedupeArray(
    parseAllReferences(contentInPhrase.contentByPath, []).map(
      (ref) => ref._ref,
    ),
  )

  const { targetLang } = freshPTD.phraseMetadata
  const TMD = finalDoc.phraseMetadata.expanded
  const TMDTarget = TMD.targets.find((t) => t._key === targetLang.sanity)

  let referenceMap = TMDTarget?.referenceMap || {}
  const uncachedReferences = references.filter((ref) => !referenceMap[ref])

  if (uncachedReferences.length > 0) {
    const newReferenceMap = await i18nAdapter.getTranslatedReferences({
      references: uncachedReferences,
      sanityClient,
      targetLang: targetLang.sanity,
      translatableTypes,
    })
    referenceMap = {
      ...referenceMap,
      ...newReferenceMap,
    }

    if (TMDTarget?._key) {
      try {
        // Cache referenceMap for future requests
        await sanityClient
          .patch(finalDoc.phraseMetadata.expanded._id, {
            set: {
              [`targets[_key == "${TMDTarget._key}"].referenceMap`]:
                referenceMap,
            },
          })
          .commit({ returnDocuments: false })
      } catch (_error) {
        // No need to act on errors - cache will be skipped
      }
    }
  }

  Object.entries(contentInPhrase.contentByPath).forEach(
    ([pathKey, content]) => {
      const path = stringToPath(pathKey)
      const parsedContent = phraseToSanity(content)

      finalDoc = modifyDocInPath({
        originalDoc: finalDoc,
        changedContent: parsedContent,
        path,
        referenceMap,
      })
    },
  )

  return finalDoc
}
