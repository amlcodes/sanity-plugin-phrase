import { collate } from 'sanity'
import getDocHistory from './getDocHistory'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { undraftId } from './utils'
import { diffPatch } from 'sanity-diff-patch'
import { fromString } from '@sanity/util/paths'

export async function getStaleTranslations({
  freshDocumentsByLang,
  sourceDoc,
}: TranslationRequest & {
  freshDocumentsByLang: Record<string, SanityTranslationDocPair>
}) {
  const sourceDocs = freshDocumentsByLang[sourceDoc.lang]
  const sourceDocToConsider = sourceDocs.draft || sourceDocs.published

  if (!sourceDocToConsider) {
    return {
      stale: false,
    }
  }

  // If no Phrase translations, all is stale
  if (
    !Array.isArray(sourceDocToConsider.phraseTranslations) ||
    sourceDocToConsider.phraseTranslations.length <= 0
  ) {
    return {
      stale: 'entire-document',
    }
  }

  // @TODO: uncomment?
  // if (ongoingTranslations.length > 0) {
  //   return {
  //     stale: 'ongoing-translations',
  //   }
  // }

  const ongoingTranslations = sourceDocToConsider.phraseTranslations.filter(
    (t) => t.status !== 'COMPLETED',
  )
  const newestToOldest = ongoingTranslations.sort(
    (a, b) =>
      new Date(b._createdAt).valueOf() - new Date(a._createdAt).valueOf(),
  )

  const docsInHistory = await getDocHistory({
    // @TODO replace with proper values (unsure how)
    docId: sourceDoc._id,
    date: new Date(newestToOldest[0]._createdAt),
  })
  const collatedHistory = collate(
    docsInHistory.filter(
      (doc) => undraftId(doc._id) === undraftId(sourceDoc._id),
    ),
  )[0]

  const changesByVersion = {
    draft:
      sourceDocs.draft &&
      collatedHistory.draft &&
      getSourceChanges(sourceDocs.draft, collatedHistory.draft),
    published:
      sourceDocs.published &&
      collatedHistory.published &&
      getSourceChanges(sourceDocs.published, collatedHistory.published),
  }
  console.log({ changesByVersion })
}

function getSourceChanges(
  currentVersion: SanityDocumentWithPhraseMetadata,
  historicVersion: SanityDocumentWithPhraseMetadata,
) {
  const diffPatches = diffPatch(historicVersion, currentVersion)
  const pathsChanged = diffPatches.flatMap(({ patch }) => {
    let paths: string[] = []
    if ('set' in patch) {
      paths.push(...Object.keys(patch.set))
    }
    if ('unset' in patch) {
      paths.push(...Object.keys(patch.unset))
    }
    if ('diffMatchPatch' in patch) {
      paths.push(...Object.keys(patch.diffMatchPatch))
    }

    return paths
  })

  return Array.from(new Set(pathsChanged)).map((stringPath) =>
    fromString(stringPath),
  )
}
