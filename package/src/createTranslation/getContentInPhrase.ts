import { get } from '@sanity/util/paths'
import { ContentInPhrase, ContextWithProject, ToTranslateItem } from '../types'
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
    toTranslate: paths.map((_diffPath): ToTranslateItem => {
      if (_diffPath.op === 'unset')
        return {
          _diffPath,
        }

      // @ts-expect-error not sure how to model `ToTranslateItem` in a way that respects the different '_diffPaths'
      return { _diffPath, data: get(document, _diffPath.path) }
    }),
  }
}
