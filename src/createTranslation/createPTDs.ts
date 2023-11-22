import { ContextWithJobs, METADATA_KEY, SanityPTD } from '~/types'
import {
  dedupeArray,
  getPtdId,
  getTmdId,
  isDraft,
  langAdapter,
  undraftId,
} from '~/utils'
import { i18nAdapter } from '../adapters'
import { mergeDocs } from '../mergeDocs'

/**
 * PTD: Parallel Translation Document
 */
export function createPTDs({
  request: { paths, sourceDoc, translationKey },
  jobs,
  freshSourceDoc,
  freshDocuments,
}: ContextWithJobs) {
  const createdTargetLangs = dedupeArray(
    jobs.flatMap((j) => j.targetLang || []),
  )

  /** And create _one_ PTD for each target language */
  const PTDs = createdTargetLangs.map((targetPhraseLang) => {
    const targetLangDocPair = freshDocuments.find(
      (d) => d.lang.phrase === targetPhraseLang,
    )
    const targetLangDoc =
      targetLangDocPair?.draft || targetLangDocPair?.published || freshSourceDoc

    // For content in `path`, use `sourceDoc` instead as we'd rather have the original language as the reference in previews for linguists.
    const baseDoc = mergeDocs({
      originalDoc: targetLangDoc,
      changedDoc: freshSourceDoc,
      paths,
    })

    const targetLang = langAdapter.phraseToCrossSystem(targetPhraseLang)
    return i18nAdapter.injectDocumentLang<SanityPTD>(
      {
        ...baseDoc,
        _id: getPtdId({
          translationKey,
          targetLang,
        }),
        // @ts-expect-error allow creation of document with empty _rev
        _rev: undefined,
        [METADATA_KEY]: {
          _type: 'phrase.ptd.meta',
          targetLang,
          sourceDoc: {
            _type: 'reference',
            _ref: undraftId(sourceDoc._id),
            _weak: isDraft(sourceDoc._id) ? true : undefined,
            _strengthenOnPublish: isDraft(sourceDoc._id)
              ? {
                  type: sourceDoc._type,
                }
              : undefined,
          },
          targetDoc: {
            _type: 'reference',
            _ref: undraftId(targetLangDoc._id),
            _weak: isDraft(targetLangDoc._id) ? true : undefined,
            _strengthenOnPublish: isDraft(sourceDoc._id)
              ? {
                  type: sourceDoc._type,
                }
              : undefined,
          },
          tmd: {
            _type: 'reference',
            _ref: getTmdId(translationKey),
          },
        },
      },
      targetPhraseLang,
    )
  })

  return PTDs
}
