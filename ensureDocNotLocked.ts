import { Path } from '@sanity/types'
import pathsIntersect from './pathsIntersect'
import { SanityTranslationDocPair } from './types'

export default function ensureDocNotLocked(
  freshDocuments: SanityTranslationDocPair[],
  path: Path,
) {
  if (
    freshDocuments.some((d) => {
      const allMeta = [
        ...(d.draft?.phraseTranslations || []),
        ...(d.published?.phraseTranslations || []),
      ]
      const allPaths = allMeta.map((m) => m.path)
      return allPaths.some((p) => pathsIntersect(p, path))
    })
  ) {
    throw new Error('Translation already pending for this path')
  }
}
