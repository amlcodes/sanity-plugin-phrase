import { SanityTranslationDocPair, TranslationRequest } from './types'
import { pathsIntersect } from './utils'

export default function ensureDocNotLocked({
  paths,
  freshDocuments,
}: TranslationRequest & {
  freshDocuments: SanityTranslationDocPair[]
}) {
  if (
    freshDocuments.some((d) => {
      const allMeta = [
        ...(d.draft?.phraseTranslations || []),
        ...(d.published?.phraseTranslations || []),
      ]
      const ongoingPaths = allMeta.flatMap((m) => {
        // Ignore completed translations
        if (m.status === 'COMPLETED') return []

        return m.paths
      })

      return ongoingPaths.some((ongoingPath) =>
        paths.some((requestedPath) =>
          pathsIntersect(ongoingPath, requestedPath),
        ),
      )
    })
  ) {
    throw new Error('Translation already pending for this path')
  }
}
