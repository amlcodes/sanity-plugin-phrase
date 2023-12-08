import { SanityClient } from 'sanity'
import decodeFromPhrase from './decodeFromPhrase'
import {
  ContentInPhrase,
  PhrasePluginOptions,
  SanityPTDWithExpandedMetadata,
} from './types'
import { applyPatches, dedupeArray, diffPathToPatch } from './utils'
import {
  injectTranslatedReferences,
  parseAllReferences,
} from './utils/references'

export default async function phraseDocumentToSanityDocument({
  contentInPhrase,
  freshPTD,
  sanityClient,
  pluginOptions,
}: {
  contentInPhrase: ContentInPhrase
  freshPTD: SanityPTDWithExpandedMetadata
  sanityClient: SanityClient
  pluginOptions: PhrasePluginOptions
}): Promise<typeof freshPTD> {
  const references = dedupeArray(
    parseAllReferences(contentInPhrase.toTranslate, []).map((ref) => ref._ref),
  )

  const { targetLang } = freshPTD.phraseMetadata
  const TMD = freshPTD.phraseMetadata.expanded
  const TMDTarget = TMD.targets.find((t) => t._key === targetLang.sanity)

  let referenceMap = TMDTarget?.referenceMap || {}
  const uncachedReferences = references.filter((ref) => !referenceMap[ref])

  if (uncachedReferences.length > 0) {
    const newReferenceMap =
      await pluginOptions.i18nAdapter.getTranslatedReferences({
        references: uncachedReferences,
        sanityClient,
        targetLang: targetLang.sanity,
        translatableTypes: pluginOptions.translatableTypes,
      })
    referenceMap = {
      ...referenceMap,
      ...newReferenceMap,
    }

    if (TMDTarget?._key) {
      try {
        // Cache referenceMap for future requests
        await sanityClient
          .patch(freshPTD.phraseMetadata.expanded._id, {
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

  const patches = contentInPhrase.toTranslate.map((toTranslate) => {
    const dataWithReferences = injectTranslatedReferences({
      data: decodeFromPhrase(
        'data' in toTranslate ? toTranslate.data : undefined,
      ),
      referenceMap,
    })

    return diffPathToPatch(toTranslate._diff, dataWithReferences)
  })

  return applyPatches(freshPTD, patches)
}
