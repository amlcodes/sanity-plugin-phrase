import { modifyDocInPath } from './mergeDocs'
import phraseToSanity from './phraseToSanity'
import { ContentInPhrase, SanityDocumentWithPhraseMetadata } from './types'
import { stringToPath } from './utils'

export default function phraseDocumentToSanityDocument(
  phrase: ContentInPhrase,
  startingDoc: SanityDocumentWithPhraseMetadata,
): typeof startingDoc {
  let finalDoc = { ...startingDoc }

  Object.entries(phrase.contentByPath).forEach(([pathKey, content]) => {
    const path = stringToPath(pathKey)
    const parsedContent = phraseToSanity(content)

    finalDoc = modifyDocInPath({
      originalDoc: finalDoc,
      changedContent: parsedContent,
      path,
    })
  })

  return finalDoc
}
