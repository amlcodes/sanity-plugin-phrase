import { get } from '@sanity/util/paths'
import sanityToPhrase from '../sanityToPhrase'
import {
  ContentInPhrase,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from '~/types'
import { pathToString } from '~/utils'

export default function getDataToTranslate({
  freshDocumentsById,
  sourceDoc,
  paths,
}: TranslationRequest & {
  freshDocumentsById: Record<string, SanityDocumentWithPhraseMetadata>
}): ContentInPhrase {
  const document = freshDocumentsById[sourceDoc._id]
  return {
    // @TODO: configurable context
    _sanityContext: `
        <h1>Preview translated content</h1>
        <p>Find the preview for this content by clicking below:</p>
        <p>
          <a style="display: inline-block; background: papayawhip; padding: 0.5em 1em;" href="https://mulungood.com">
            See preview
          </a>
        </p>
      `,
    contentByPath: Object.fromEntries(
      paths.map((path) => [
        pathToString(path),
        sanityToPhrase(get(document, path)),
      ]),
    ),
  }
}
