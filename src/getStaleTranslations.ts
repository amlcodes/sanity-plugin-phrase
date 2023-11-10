import { collate } from 'sanity'
import getDocHistory from './getDocHistory'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { dedupeArray, undraftId } from './utils'
import { diffPatch } from 'sanity-diff-patch'
import { fromString } from '@sanity/util/paths'

export async function getStaleTranslations({
  freshDocuments,
  sourceDoc,
  sanityClient,
}: TranslationRequest & {
  freshDocuments: SanityTranslationDocPair[]
}) {
  const sourceDocPair = freshDocuments.find(
    (d) => d.lang.phrase === sourceDoc.lang.phrase,
  )
  const sourceDocToConsider = sourceDocPair?.draft || sourceDocPair?.published

  if (!sourceDocToConsider) {
    return {
      stale: false,
    }
  }

  // If no Phrase translations, all is stale
  if (
    sourceDocToConsider.phraseMeta?._type !== 'phrase.main.meta' ||
    !Array.isArray(sourceDocToConsider.phraseMeta.translations) ||
    sourceDocToConsider.phraseMeta.translations.length <= 0
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

  const ongoingTranslations =
    sourceDocToConsider.phraseMeta.translations.filter(
      (t) => t.status !== 'COMPLETED',
    )
  const newestToOldest = ongoingTranslations.sort(
    (a, b) =>
      new Date(b._createdAt).valueOf() - new Date(a._createdAt).valueOf(),
  )

  const docsInHistory = await getDocHistory(sanityClient, {
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
      sourceDocPair.draft &&
      collatedHistory.draft &&
      getSourceChanges(sourceDocPair.draft, collatedHistory.draft),
    published:
      sourceDocPair.published &&
      collatedHistory.published &&
      getSourceChanges(sourceDocPair.published, collatedHistory.published),
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

  return dedupeArray(pathsChanged).map((stringPath) => fromString(stringPath))
}

// TO DELETe

// async function test() {
//   const sourceLang = 'en'
//   const docId = 'db16b562-bd32-42fd-8c39-35eb3bd7ddb7'
//   const docsInHistory = await getDocHistory({
//     docId,
//     rev: 'MtZ1iO3NDSTO65iZoAQ6P4',
//   })
//   const { freshDocumentsByLang } = await queryFreshDocuments({
//     templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
//     sourceDoc: {
//       _id: docId,
//       _type: 'post',
//       lang: sourceLang,
//     },
//     targetLangs: ['pt'],
//     paths: [],
//   })

//   const sourceDocs = freshDocumentsByLang[sourceLang]
//   console.log({ sourceDocs })
//   const collatedHistory = collate(
//     docsInHistory.filter((doc) => undraftId(doc._id) === undraftId(docId)),
//   )[0]

//   if (!collatedHistory) {
//     console.log('@TODO: deal with missing history')
//     return
//   }

//   const collatedCurrentHistoric = {
//     draft:
//       sourceDocs.draft &&
//       collatedHistory.draft &&
//       getSourceChanges(sourceDocs.draft, collatedHistory.draft),
//     published:
//       sourceDocs.published &&
//       collatedHistory.published &&
//       getSourceChanges(sourceDocs.published, collatedHistory.published),
//   }

//   // const sourceChanges =
//   console.log({ collatedCurrentHistoric })
// }

// // test()

// async function test2(props: TranslationRequest) {
//   // const { freshDocuments, freshDocumentsByLang, freshDocumentsById } =
//   //   await queryFreshDocuments(props)
//   // // await lockDocument({ freshDocuments, ...props })

//   // const stale = await getStaleTranslations({ ...props, freshDocumentsByLang })
//   // console.log({ stale })

//   const [publishedHistory, draftHistory] = await Promise.all([
//     getDocHistory({
//       docId: undraftId(props.sourceDoc._id),
//       // rev: props.sourceDoc._rev,
//       date: new Date('2023-11-02T20:11:04.161Z'),
//     }),
//     getDocHistory({
//       docId: draftId(props.sourceDoc._id),
//       // rev: props.sourceDoc._rev,
//       date: new Date('2023-11-02T20:11:04.161Z'),
//     }),
//   ])
//   console.log(
//     '\n\n\nPUBLISHED',
//     publishedHistory.map((t) => ({ ...t, body: undefined })),
//   )
//   console.log(
//     '\n\n\nDRAFT',
//     draftHistory.map((t) => ({ ...t, body: undefined })),
//   )
// }

// test2({
//   templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
//   sourceDoc: {
//     // _rev: '6A1LlYz54jYGCn2JRJwqWw',
//     // _id: 'db16b562-bd32-42fd-8c39-35eb3bd7ddb7',
//     // _rev: '5beab831-6fb8-4be8-a62c-34f06b5dcacf', // v2
//     _rev: '39b186fa-4cca-44a3-885f-ba6f036204ed', // v3
//     _id: 'drafts.db16b562-bd32-42fd-8c39-35eb3bd7ddb7',
//     _type: 'post',
//     lang: 'en',
//   },
//   targetLangs: ['pt'],
//   paths: [[]],
// })
