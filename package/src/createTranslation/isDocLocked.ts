import { ContextWithFreshDocuments } from '../types'
import {
  isTranslationCommitted,
  parseStringifiedDiffs,
  targetLangsIntersect,
  translationPathsIntersect,
} from '../utils'

export class DocumentsLockedError {
  readonly _tag = 'DocumentsLockedError'
}

export default function isDocLocked({
  request,
  freshDocuments,
}: {
  freshDocuments: ContextWithFreshDocuments['freshDocuments']
  request: Pick<ContextWithFreshDocuments['request'], 'diffs' | 'targetLangs'>
}) {
  const someDocLocked = freshDocuments.some((d) => {
    const allTranslationsMatchingLangs = [
      ...((d.draft?.phraseMetadata?._type === 'phrase.main.meta' &&
        d.draft.phraseMetadata.translations) ||
        []),
      ...((d.published?.phraseMetadata?._type === 'phrase.main.meta' &&
        d.published.phraseMetadata.translations) ||
        []),
    ].filter(
      (translation) =>
        !('targetLangs' in translation) ||
        targetLangsIntersect(translation.targetLangs, request.targetLangs),
    )
    const ongoingPaths = allTranslationsMatchingLangs.flatMap((m) => {
      // Ignore committed translations
      if (isTranslationCommitted(m)) return []

      return parseStringifiedDiffs(m.diffs) || []
    })

    return ongoingPaths.some(
      ({ path: ongoingPath }) =>
        // If the ongoing path is empty, it's a translation for the whole document, at which point it's definitely locked
        ongoingPath.length === 0 ||
        // Or if there's any overlap on field-level translations, it's also locked
        request.diffs.some(({ path: requestedPath }) =>
          translationPathsIntersect(ongoingPath, requestedPath),
        ),
    )
  })

  return someDocLocked
}
