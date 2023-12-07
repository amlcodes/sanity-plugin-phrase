import { collate } from 'sanity'
import {
  CrossSystemLangCode,
  PhrasePluginOptions,
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
  SanityTMD,
  StaleResponse,
  StaleStatus,
  StaleTargetStatus,
  TargetLangStaleness,
  TranslationRequest,
} from '../types'
import {
  allTranslationsUnfinished,
  dedupeArray,
  draftId,
  getChangedPaths,
  getPathsKey,
  getTranslationSnapshot,
  isMainDocAndTranslatedForLang,
  isTranslationCommitted,
  langsAreTheSame,
  parseTranslationSnapshot,
  undraftId,
} from '../utils'

export default async function getStaleTranslations({
  sourceDocs,
  sanityClient,
  pluginOptions,
  targetLangs: sanityTargetLangs,
}: {
  sourceDocs: TranslationRequest['sourceDoc'][]
  sanityClient: TranslationRequest['sanityClient']
  pluginOptions: PhrasePluginOptions
  targetLangs: SanityLangCode[]
}) {
  const targetLangs =
    pluginOptions.langAdapter.sanityToCrossSystem(sanityTargetLangs)
  const freshDocuments = await sanityClient.fetch<
    SanityDocumentWithPhraseMetadata[]
  >(`*[_id in $ids]`, {
    ids: sourceDocs.flatMap((d) =>
      d._id ? [undraftId(d._id), draftId(d._id)] : [],
    ),
  })

  const collated = collate(freshDocuments)

  const parsedPerLang = sourceDocs.flatMap((sourceDoc) => {
    const docPair = collated.find(
      (c) => undraftId(c.id) === undraftId(sourceDoc._id),
    )
    const freshestDoc = docPair?.draft || docPair?.published
    return targetLangs.map((lang) =>
      parsePerLang({ sourceDoc, lang, freshestDoc, pluginOptions }),
    )
  })

  const TMDsToDiff = dedupeArray(
    parsedPerLang.flatMap((parsedLang) => {
      if ('tmdRefToDiff' in parsedLang) {
        return parsedLang.tmdRefToDiff
      }
      return []
    }),
  )

  const TMDs =
    TMDsToDiff.length > 0
      ? await sanityClient.fetch<SanityTMD[]>('*[_id in $ids]', {
          ids: TMDsToDiff,
        })
      : []

  const finalPerLang = parsedPerLang.map(
    (
      parsedLang,
    ): { sourceDoc: TranslationRequest['sourceDoc'] } & TargetLangStaleness => {
      if ('status' in parsedLang || !('tmdRefToDiff' in parsedLang))
        return parsedLang

      const TMD = TMDs.find((t) => t._id === parsedLang.tmdRefToDiff)

      if (!TMD || !parsedLang.freshestDoc) {
        return {
          ...parsedLang,
          status: StaleStatus.UNTRANSLATED,
        }
      }

      const changedPaths = getChangedPaths({
        currentVersion: parseTranslationSnapshot(
          getTranslationSnapshot(parsedLang.freshestDoc),
        ),
        historicVersion: parseTranslationSnapshot(TMD.sourceSnapshot),
      })

      if (changedPaths.length === 0) {
        return {
          ...parsedLang,
          status: StaleStatus.FRESH,
          translationDate: TMD._updatedAt || TMD._createdAt,
        }
      }

      return {
        ...parsedLang,
        status: StaleStatus.STALE,
        changedPaths: changedPaths as TranslationRequest['paths'],
        translationDate: TMD._createdAt,
      }
    },
  )

  const joinedBySourceDoc = finalPerLang.reduce(
    (bySourceDoc, parsedLang) => {
      return {
        ...bySourceDoc,
        [parsedLang.sourceDoc._id]: {
          sourceDoc: parsedLang.sourceDoc,
          targets: [
            ...(bySourceDoc[parsedLang.sourceDoc._id]?.targets || []),
            parsedLang,
          ],
        },
      }
    },
    {} as Record<string, StaleResponse>,
  )

  return Object.values(joinedBySourceDoc)
}

export function isTargetStale(
  target: TargetLangStaleness,
): target is StaleTargetStatus {
  return 'status' in target && target.status === StaleStatus.STALE
}

export function getTranslatableTargetsByPath(
  targets: TargetLangStaleness[] = [],
) {
  return targets.reduce(
    (byPath, t) => {
      if (
        !('status' in t) ||
        (!isTargetStale(t) && t.status !== StaleStatus.UNTRANSLATED)
      )
        return byPath

      const paths: TranslationRequest['paths'] = isTargetStale(t)
        ? t.changedPaths
        : [[]]
      const pathKey = getPathsKey(paths)
      return {
        ...byPath,
        [pathKey]: {
          langs: [...(byPath[pathKey]?.langs || []), t.lang],
          paths,
          translationDate:
            'translationDate' in t ? t.translationDate : undefined,
        },
      }
    },
    {} as Record<
      string,
      {
        langs: StaleTargetStatus['lang'][]
        paths: TranslationRequest['paths']
      } & Pick<Partial<StaleTargetStatus>, 'translationDate'>
    >,
  )
}

function parsePerLang({
  sourceDoc,
  lang,
  freshestDoc,
  pluginOptions: { translatableTypes },
}: {
  freshestDoc: SanityDocumentWithPhraseMetadata | undefined
  sourceDoc: TranslationRequest['sourceDoc']
  lang: CrossSystemLangCode
  pluginOptions: PhrasePluginOptions
}): {
  sourceDoc: typeof sourceDoc
  freshestDoc: typeof freshestDoc
} & (
  | TargetLangStaleness
  | {
      lang: CrossSystemLangCode
      tmdRefToDiff: string
    }
) {
  if (!translatableTypes.includes(sourceDoc._type)) {
    return {
      freshestDoc,
      sourceDoc,
      lang,
      status: StaleStatus.UNTRANSLATABLE,
    }
  }

  if (!freshestDoc || !isMainDocAndTranslatedForLang(freshestDoc, lang)) {
    return {
      freshestDoc,
      sourceDoc,
      lang,
      status: StaleStatus.UNTRANSLATED,
    }
  }

  if (
    allTranslationsUnfinished(freshestDoc, [lang]) ||
    freshestDoc.phraseMetadata.translations.some(
      (t) =>
        t.status === 'FAILED_PERSISTING' &&
        t.targetLangs.some((l) => langsAreTheSame(l, lang)),
    )
  ) {
    return {
      freshestDoc,
      sourceDoc,
      lang,
      status: StaleStatus.ONGOING,
    }
  }

  const lastCommittedTranslation = freshestDoc.phraseMetadata.translations
    .sort(
      (a, b) =>
        new Date(b._createdAt).valueOf() - new Date(a._createdAt).valueOf(),
    )
    .filter(isTranslationCommitted)
    .filter((t) => t.targetLangs.some((l) => langsAreTheSame(l, lang)))[0]

  if (!lastCommittedTranslation?.tmd?._ref) {
    return {
      freshestDoc,
      sourceDoc,
      lang,
      status: StaleStatus.UNTRANSLATED,
    }
  }

  return {
    freshestDoc,
    sourceDoc,
    lang,
    tmdRefToDiff: lastCommittedTranslation.tmd._ref,
  }
}
