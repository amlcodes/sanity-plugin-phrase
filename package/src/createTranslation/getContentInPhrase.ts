import { get } from '@sanity/util/paths'
import { ContentInPhrase, ContextWithProject, ToTranslateItem } from '../types'
import getPreviewContext from './getPreviewContext'

export default function getContentInPhrase(
  context: ContextWithProject,
): ContentInPhrase {
  const {
    freshDocumentsById,
    request: { diffs, sourceDoc },
  } = context
  const document = freshDocumentsById[sourceDoc._id]
  return {
    _sanityContext: getPreviewContext(context),
    toTranslate: diffs.map((_diff): ToTranslateItem => {
      if (_diff.op === 'unset')
        return {
          _diff,
        }

      // @ts-expect-error not sure how to model `ToTranslateItem` in a way that respects the different '_diff's
      return { _diff, data: get(document, _diff.path) }
    }),
  }
}
