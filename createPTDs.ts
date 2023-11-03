import { SanityDocument } from '@sanity/types'
import { Phrase, SanityTranslationDocPair, TranslationRequest } from './types'
import { makeKeyFriendly, mergeDocs, undraftId } from './utils'
import { i18nAdapter } from './i18nAdapter'

/**
 * PTD: Parallel Translation Document
 */
export function createPTDs({
  project,
  jobs,
  freshSourceDoc,
  paths,
  freshDocumentsByLang,
  sourceDoc,
}: TranslationRequest & {
  project: Phrase['CreatedProject']
  jobs: Phrase['JobPart'][]
  freshSourceDoc: SanityDocument
  freshDocumentsByLang: Record<string, SanityTranslationDocPair>
}) {
  /** Join jobs by target language */
  const jobCollections = jobs.reduce((acc, job) => {
    if (!job.targetLang) return acc

    return {
      ...acc,
      [job.targetLang]: [...(acc[job.targetLang] || []), job],
    }
  }, {} as Record<string, Phrase['JobPart'][]>)

  /** And create _one_ PTD for each target language */
  const PTDs = Object.entries(jobCollections).map(([targetLang, jobs]) => {
    const targetLangDoc =
      freshDocumentsByLang[targetLang]?.draft ||
      freshDocumentsByLang[targetLang]?.published ||
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
        // @TODO: can we rely on ID paths or should we split by `-`?
        _id: `${
          undraftId(freshSourceDoc._id) !== freshSourceDoc._id ? 'drafts.' : ''
        }phrase-translation--${undraftId(freshSourceDoc._id)}--${targetLang}`,
        phrasePtd: {
          _type: 'phrase.ptd.meta',
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
          targetLang,
          sourceLang: sourceDoc.lang,
          filename: jobs[0].filename,
          sourceFileUid: jobs[0].sourceFileUid,
          dateCreated: jobs[0].dateCreated,
        },
      },
      targetLang,
    )
  })

  return PTDs
}
