import { get } from '@sanity/util/paths'
import sanityToPhrase from './sanityToPhrase'
import {
  DataToTranslate,
  SanityDocumentWithPhraseMetadata,
  TranslationRequest,
} from './types'
import { pathToString } from './utils'

export default function getDataToTranslate({
  freshDocumentsById,
  sourceDoc,
  paths,
}: TranslationRequest & {
  freshDocumentsById: Record<string, SanityDocumentWithPhraseMetadata>
}): DataToTranslate {
  const document = freshDocumentsById[sourceDoc._id]
  return {
    _sanityRev: sourceDoc._rev,
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
