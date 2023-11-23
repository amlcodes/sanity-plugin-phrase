import { collate } from 'sanity'
import {
  SanityDocumentWithPhraseMetadata,
  SanityLangCode,
  SanityTMD,
  StaleResponse,
  StaleStatus,
  TargetLangStaleness,
  TranslationRequest,
} from '~/types'
import {
  draftId,
  getTranslationSnapshot,
  isTranslatedMainDoc,
  langAdapter,
  translationsUnfinished,
  undraftId,
} from '~/utils'
import { getChangedPaths } from '~/utils/paths'
import parseTMDsToDiff from './parseTMDsToDiff'

export default async function getStaleTranslations({
  sourceDocs,
  sanityClient,
  translatableTypes,
  targetLangs: sanityTargetLangs,
}: {
  sourceDocs: TranslationRequest['sourceDoc'][]
  sanityClient: TranslationRequest['sanityClient']
  translatableTypes: string[]
  targetLangs: SanityLangCode[]
}) {
  const targetLangs = langAdapter.sanityToCrossSystem(sanityTargetLangs)
  const freshDocuments = await sanityClient.fetch<
    SanityDocumentWithPhraseMetadata[]
  >(`*[_id in $ids]`, {
    ids: sourceDocs.flatMap((d) =>
      d._id ? [undraftId(d._id), draftId(d._id)] : [],
    ),
  })

  const collated = collate(freshDocuments)

  async function parseStaleness(
    sourceDoc: TranslationRequest['sourceDoc'],
  ): Promise<StaleResponse> {
    if (!translatableTypes.includes(sourceDoc._type)) {
      return {
        sourceDoc,
        targets: targetLangs.map((lang) => ({
          lang,
          status: StaleStatus.UNTRANSLATABLE,
        })),
      }
    }

    const docPair = collated.find(
      (c) => undraftId(c.id) === undraftId(sourceDoc._id),
    )
    const freshestDoc = docPair?.draft || docPair?.published

    if (!freshestDoc || !isTranslatedMainDoc(freshestDoc)) {
      return {
        sourceDoc,
        targets: targetLangs.map((lang) => ({
          lang,
          status: StaleStatus.UNTRANSLATED,
        })),
      }
    }

    if (translationsUnfinished(freshestDoc)) {
      return {
        sourceDoc,
        targets: targetLangs.map((lang) => ({
          lang,
          status: StaleStatus.ONGOING,
        })),
      }
    }

    const TMDsToDiff = parseTMDsToDiff(freshestDoc, targetLangs)
    const TMDs = await sanityClient.fetch<SanityTMD[]>('*[_id in $ids]', {
      ids: TMDsToDiff.map((t) => t.ref),
    })
    const diffs = TMDs.flatMap((tmd) => {
      const changedPaths = getChangedPaths(
        getTranslationSnapshot(freshestDoc),
        tmd.sourceSnapshot,
      )
      return tmd.targets.map((t) => ({
        lang: t.lang,
        changedPaths,
        translationDate: tmd._createdAt,
      }))
    })
    const targets: TargetLangStaleness[] = targetLangs.map((lang) => {
      const diff = diffs.find((d) => d.lang.sanity === lang.sanity)
      if (!diff) {
        return {
          lang,
          status: StaleStatus.UNTRANSLATED,
        }
      }

      if (diff.changedPaths.length === 0) {
        return {
          lang,
          status: StaleStatus.FRESH,
        }
      }

      return {
        lang,
        status: StaleStatus.STALE,
        changedPaths: diff.changedPaths,
        translationDate: diff.translationDate,
      }
    })

    return {
      sourceDoc,
      targets,
    }
  }

  const parsedStaleness = await Promise.allSettled(
    sourceDocs.map(parseStaleness),
  )

  const res = parsedStaleness.map((r, index) => {
    if (r.status === 'rejected') {
      return {
        sourceDoc: sourceDocs[index],
        targets: targetLangs.map((lang) => ({
          lang,
          error: r.reason,
        })),
      }
    }

    return r.value
  })

  return res
}
