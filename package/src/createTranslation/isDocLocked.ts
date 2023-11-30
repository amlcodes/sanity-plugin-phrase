import { ContextWithFreshDocuments } from '../types'
import { isTranslationCommitted, translationsIntersect } from '../utils'

export class DocumentsLockedError {
  readonly _tag = 'DocumentsLockedError'
}

export default function isDocLocked({
  request: { paths },
  freshDocuments,
}: ContextWithFreshDocuments) {
  const someDocLocked = freshDocuments.some((d) => {
    const allMeta = [
      ...((d.draft?.phraseMetadata?._type === 'phrase.main.meta' &&
        d.draft.phraseMetadata.translations) ||
        []),
      ...((d.published?.phraseMetadata?._type === 'phrase.main.meta' &&
        d.published.phraseMetadata.translations) ||
        []),
    ]
    const ongoingPaths = allMeta.flatMap((m) => {
      // Ignore committed translations
      if (isTranslationCommitted(m)) return []

      return m.paths
    })

    return ongoingPaths.some(
      (ongoingPath) =>
        // If the ongoing path is empty, it's a translation for the whole document, at which point it's definitely locked
        ongoingPath.length === 0 ||
        // Or if there's any overlap on field-level translations, it's also locked
        paths.some((requestedPath) =>
          translationsIntersect(ongoingPath, requestedPath),
        ),
    )
  })

  return someDocLocked
}
