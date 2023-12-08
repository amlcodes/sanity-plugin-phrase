import { ContextWithFreshDocuments } from '../types'
import {
  isTranslationCancelled,
  isTranslationCommitted,
  targetLangsIntersect,
  translationPathsIntersect,
} from '../utils'

export class TranslationLockedError {
  readonly _tag = 'TranslationLockedError'
}

export default function isTranslationLocked({
  request,
  otherTMDs: TMDs,
}: ContextWithFreshDocuments) {
  const someTranslationLocked = TMDs.some((tmd) => {
    const hasMatchingLang = tmd.targets.some((t) =>
      targetLangsIntersect([t.lang], request.targetLangs),
    )

    if (
      isTranslationCommitted(tmd) ||
      isTranslationCancelled(tmd) ||
      !hasMatchingLang
    ) {
      return false
    }

    return tmd.diffs.some(
      ({ path: ongoingPath }) =>
        // If the ongoing path is empty, it's a translation for the whole document, at which point it's definitely locked
        ongoingPath.length === 0 ||
        // Or if there's any overlap on field-level translations, it's also locked
        request.diffs.some(({ path: requestedPath }) =>
          translationPathsIntersect(ongoingPath, requestedPath),
        ),
    )
  })

  return someTranslationLocked
}
