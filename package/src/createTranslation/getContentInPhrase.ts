import { get } from '@sanity/util/paths'
import sanityToPhrase from '../sanityToPhrase'
import { ContentInPhrase, ContextWithProject } from '../types'
import { pathToString } from '../utils'
import getPreviewContext from './getPreviewContext'

export default function getContentInPhrase(
  context: ContextWithProject,
): ContentInPhrase {
  const {
    freshDocumentsById,
    request: { paths, sourceDoc },
  } = context
  const document = freshDocumentsById[sourceDoc._id]
  return {
    _sanityContext: getPreviewContext(context),
    contentByPath: Object.fromEntries(
      paths.map((path) => [
        pathToString(path),
        sanityToPhrase(get(document, path)),
      ]),
    ),
  }
}
