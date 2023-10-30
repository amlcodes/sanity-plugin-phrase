import { sanityClient } from './sanityClient'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
} from './types'
import { undraftId } from './utils'

export default async function queryFreshDocuments(docId: string) {
  // @TODO: make query configurable by users
  const freshDocuments = await sanityClient.fetch<SanityTranslationDocPair[]>(
    /* groq */ `
  *[_type == "translation.metadata" && references($undraftedId)][0]
    .translations[]{
      "lang": _key,
      "published": value->,
      "draft": *[_id == ("drafts." + ^.value._ref)][0],
    }
  `,
    {
      undraftedId: undraftId(docId),
    },
  )

  const freshDocumentsByLang = freshDocuments.reduce(
    (acc, t) => ({
      ...acc,
      [t.lang]: t,
    }),
    {} as Record<string, SanityTranslationDocPair>,
  )

  const freshDocumentsById = freshDocuments.reduce((acc, t) => {
    if (t.draft) acc[t.draft._id] = t.draft
    if (t.published) acc[t.published._id] = t.published

    return acc
  }, {} as Record<string, SanityDocumentWithPhraseMetadata>)

  return { freshDocumentsByLang, freshDocumentsById, freshDocuments }
}
