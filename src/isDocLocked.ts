import { SanityTranslationDocPair, TranslationRequest } from './types'
import { translationsIntersect } from './utils'

export class DocumentsLockedError {
  readonly _tag = 'DocumentsLockedError'
}

export default function isDocLocked({
  paths,
  freshDocuments,
}: Pick<TranslationRequest, 'paths'> & {
  freshDocuments: SanityTranslationDocPair[]
}) {
  const someDocLocked = freshDocuments.some((d) => {
    const allMeta = [
      ...((d.draft?.phraseMeta?._type === 'phrase.main.meta' &&
        d.draft.phraseMeta.translations) ||
        []),
      ...((d.published?.phraseMeta?._type === 'phrase.main.meta' &&
        d.published.phraseMeta.translations) ||
        []),
    ]
    const ongoingPaths = allMeta.flatMap((m) => {
      // Ignore completed translations
      if (m.status === 'COMPLETED') return []

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
