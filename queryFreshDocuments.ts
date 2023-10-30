import { sanityClient } from './sanityClient'
import { SanityTranslationDocPair } from './types'

// @TODO: implementation
function undraftId(id: string) {
  return id.replace('drafts.', '')
}

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
    {} as Record<string, (typeof freshDocuments)[0]>,
  )

  return { freshDocumentsByLang, freshDocuments }
}
