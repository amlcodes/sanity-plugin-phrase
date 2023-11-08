import { SanityDocument } from '@sanity/types'
import { i18nAdapter } from './adapters'
import { mergeDocs } from './mergeDocs'
import {
  Phrase,
  PhraseLangCode,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import {
  getPtdId,
  isDraft,
  langAdapter,
  makeKeyFriendly,
  undraftId,
} from './utils'

/**
 * PTD: Parallel Translation Document
 */
export function createPTDs({
  project,
  jobs,
  freshSourceDoc,
  paths,
  sourceDoc,
  freshDocuments,
}: TranslationRequest & {
  project: Phrase['CreatedProject']
  jobs: Phrase['JobPart'][]
  freshSourceDoc: SanityDocument
  freshDocuments: SanityTranslationDocPair[]
}) {
  /** Join jobs by target language (`PhraseLangCode`) */
  const jobCollections = jobs.reduce((acc, job) => {
    if (!job.targetLang) return acc

    return {
      ...acc,
      [job.targetLang]: [...(acc[job.targetLang] || []), job],
    }
  }, {} as Record<PhraseLangCode, Phrase['JobPart'][]>)

  /** And create _one_ PTD for each target language */
  const PTDs = Object.entries(jobCollections).map(
    ([targetPhraseLang, jobs]) => {
      const targetLangDocPair = freshDocuments.find(
        (d) => d.lang.phrase === targetPhraseLang,
      )
      const targetLangDoc =
        targetLangDocPair?.draft ||
        targetLangDocPair?.published ||
        freshSourceDoc

      // For content in `path`, use `sourceDoc` instead as we'd rather have the original language as the reference in previews for linguists.
      const baseDoc = mergeDocs({
        originalDoc: targetLangDoc,
        changedDoc: freshSourceDoc,
        paths,
      })

      return i18nAdapter.injectDocumentLang(
        {
          ...baseDoc,
          _id: getPtdId({
            paths,
            sourceDoc,
            targetLang: langAdapter.phraseToCrossSystem(targetPhraseLang),
          }),
          // @ts-expect-error
          _rev: undefined,
          phraseMeta: {
            _type: 'phrase.ptd.meta',
            sourceDoc: {
              _type: 'reference',
              _ref: undraftId(sourceDoc._id),
              _weak: isDraft(sourceDoc._id) ? true : undefined,
            },
            paths,
            jobs: jobs.map((j) => ({
              _type: 'phrase.job',
              _key: makeKeyFriendly(j.uid || 'invalid-job'),
              uid: j.uid,
              status: j.status,
              dateDue: j.dateDue,
              dateCreated: j.dateCreated,
              workflowLevel: j.workflowLevel,
              workflowStep: j.workflowStep,
              providers: j.providers,
            })),
            projectUid: project.uid || 'invalid-project',
            targetLang: langAdapter.phraseToCrossSystem(targetPhraseLang),
            sourceLang: sourceDoc.lang,
            filename: jobs[0].filename,
            sourceFileUid: jobs[0].sourceFileUid,
            dateCreated: jobs[0].dateCreated,
          },
        },
        targetPhraseLang,
      )
    },
  )

  return PTDs
}
