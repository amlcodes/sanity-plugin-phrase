import { modifyDocInPath } from './mergeDocs'
import { parseAllReferences } from './parseAllReferences'
import phraseToSanity from './phraseToSanity'
import { ContentInPhrase, SanityDocumentWithPhraseMetadata } from '~/types'
import { dedupeArray, stringToPath } from './utils'

export default async function phraseDocumentToSanityDocument(
  phrase: ContentInPhrase,
  startingDoc: SanityDocumentWithPhraseMetadata,
): Promise<typeof startingDoc> {
  let finalDoc = { ...startingDoc }

  const references = dedupeArray(
    parseAllReferences(phrase.contentByPath, []).map((ref) => ref._ref),
  )
  console.log(references)
  // @TODO: fetch references via i18nAdapter.getTranslatedReferences
  // (only if we don't have the referenceMap cache in phraseMetadata or we want to force re-fetching)

  Object.entries(phrase.contentByPath).forEach(([pathKey, content]) => {
    const path = stringToPath(pathKey)
    const parsedContent = phraseToSanity(content)

    // @TODO: inject translated references, respecting weak & strengthenOnPublish of *each* reference occurrence
    finalDoc = modifyDocInPath({
      originalDoc: finalDoc,
      changedContent: parsedContent,
      path,
    })
  })

  return finalDoc
}
