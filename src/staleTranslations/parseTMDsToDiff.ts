import { CrossSystemLangCode, SanityMainDoc } from '../types'
import { isTranslationCommitted } from '../utils'

export default function parseTMDsToDiff(
  doc: SanityMainDoc,
  targetLangs: CrossSystemLangCode[],
) {
  /** newest to oldest */
  const sortedTranslations = doc.phraseMetadata.translations
    .sort(
      (a, b) =>
        new Date(b._createdAt).valueOf() - new Date(a._createdAt).valueOf(),
    )
    .filter(isTranslationCommitted)

  const TMDsToDiff = targetLangs.reduce(
    (projects, lang) => {
      const translation = sortedTranslations.find((t) =>
        t.targetLangs.some((l) => l.sanity === lang.sanity),
      )

      if (!translation?.tmd?._ref) return projects

      return {
        ...projects,
        [translation.tmd._ref]: [
          ...(projects[translation.tmd._ref] || []),
          lang,
        ],
      }
    },
    {} as { [TMDRef: string]: CrossSystemLangCode[] },
  )

  return Object.entries(TMDsToDiff).map(([ref, langs]) => ({
    ref,
    langs,
  }))
}
