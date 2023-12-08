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
  FULL_DOC_DIFF_PATH,
  allTranslationsUnfinished,
  draftId,
  getDiffs,
  getDiffsKey,
  getTranslationSnapshot,
  isTranslationCommitted,
  langInTMDs,
  langsAreTheSame,
  parseTranslationSnapshot,
  undraftId,
} from '../utils'

export default async function getStaleTranslations({
  pluginOptions,
  sanityClient,
  sourceDocs,
  targetLangs: sanityTargetLangs,
  TMDs,
}: {
  pluginOptions: PhrasePluginOptions
  sanityClient: TranslationRequest['sanityClient']
  sourceDocs: TranslationRequest['sourceDoc'][]
  targetLangs: SanityLangCode[]
  TMDs: SanityTMD[]
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
      parsePerLang({ sourceDoc, lang, freshestDoc, pluginOptions, TMDs }),
    )
  })

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

      const diffs = getDiffs({
        currentVersion: parseTranslationSnapshot(
          getTranslationSnapshot(parsedLang.freshestDoc),
        ),
        historicVersion: parseTranslationSnapshot(TMD.sourceSnapshot),
      })

      if (diffs.length === 0) {
        return {
          ...parsedLang,
          status: StaleStatus.FRESH,
          translationDate: TMD._updatedAt || TMD._createdAt,
        }
      }

      return {
        ...parsedLang,
        status: StaleStatus.STALE,
        diffs: diffs as TranslationRequest['diffs'],
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

      const diffs: TranslationRequest['diffs'] = isTargetStale(t)
        ? t.diffs
        : [FULL_DOC_DIFF_PATH]
      const pathKey = getDiffsKey(diffs)
      return {
        ...byPath,
        [pathKey]: {
          langs: [...(byPath[pathKey]?.langs || []), t.lang],
          diffs,
          translationDate:
            'translationDate' in t ? t.translationDate : undefined,
        },
      }
    },
    {} as Record<
      string,
      {
        langs: StaleTargetStatus['lang'][]
        diffs: TranslationRequest['diffs']
      } & Pick<Partial<StaleTargetStatus>, 'translationDate'>
    >,
  )
}

function parsePerLang({
  freshestDoc,
  lang,
  pluginOptions: { translatableTypes },
  sourceDoc,
  TMDs,
}: {
  freshestDoc: SanityDocumentWithPhraseMetadata | undefined
  lang: CrossSystemLangCode
  pluginOptions: PhrasePluginOptions
  sourceDoc: TranslationRequest['sourceDoc']
  TMDs: SanityTMD[]
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

  if (!freshestDoc || !langInTMDs(TMDs, lang)) {
    return {
      freshestDoc,
      sourceDoc,
      lang,
      status: StaleStatus.UNTRANSLATED,
    }
  }

  if (
    allTranslationsUnfinished(TMDs, [lang]) ||
    TMDs.some(
      (TMD) =>
        TMD.status === 'FAILED_PERSISTING' &&
        TMD.targets.some((t) => langsAreTheSame(t.lang, lang)),
    )
  ) {
    return {
      freshestDoc,
      sourceDoc,
      lang,
      status: StaleStatus.ONGOING,
    }
  }

  const lastCommittedTranslation = TMDs.sort(
    (a, b) =>
      new Date(b._createdAt).valueOf() - new Date(a._createdAt).valueOf(),
  )
    .filter(isTranslationCommitted)
    .filter((TMD) => TMD.targets.some((t) => langsAreTheSame(t.lang, lang)))[0]

  if (!lastCommittedTranslation) {
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
    tmdRefToDiff: lastCommittedTranslation._id,
  }
}
