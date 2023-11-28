import { ContextWithJobs, Phrase, PhraseLangCode, SanityTMD } from '../types'
import {
  TMD_TYPE,
  getPtdId,
  getTmdId,
  getTranslationSnapshot,
  isDraft,
  makeKeyFriendly,
  phraseDatetimeToJSDate,
  undraftId,
} from '../utils'

/**
 * TMD: Translation Metadata Document
 */
export function createTMD({
  request: { paths, sourceDoc, translationKey, pluginOptions },
  project,
  jobs,
  freshSourceDoc,
  freshDocuments,
}: ContextWithJobs): SanityTMD {
  /** Join jobs by target language (`PhraseLangCode`) */
  const jobCollections = jobs.reduce(
    (acc, job) => {
      if (!job.targetLang) return acc

      return {
        ...acc,
        [job.targetLang]: [...(acc[job.targetLang] || []), job],
      }
    },
    {} as Record<PhraseLangCode, Phrase['JobPart'][]>,
  )

  const createdAt = (
    phraseDatetimeToJSDate(project.dateCreated) ||
    phraseDatetimeToJSDate(jobs[0].dateCreated) ||
    new Date()
  ).toISOString()

  const targets: SanityTMD['targets'] = Object.entries(jobCollections).map(
    ([targetPhraseLang, jobCollection]) => {
      const lang =
        pluginOptions.langAdapter.phraseToCrossSystem(targetPhraseLang)
      const targetLangDocPair = freshDocuments.find(
        (d) => d.lang.phrase === targetPhraseLang,
      )
      const targetLangDoc =
        targetLangDocPair?.draft ||
        targetLangDocPair?.published ||
        freshSourceDoc

      return {
        _key: lang.sanity,
        lang,
        ptd: {
          _type: 'reference',
          _ref: getPtdId({ targetLang: lang, translationKey }),
          _weak: true,
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
        jobs: jobCollection.map((j) => ({
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
      }
    },
  )

  return {
    _createdAt: createdAt,
    _updatedAt: createdAt,
    _id: getTmdId(translationKey),
    _type: TMD_TYPE,
    // @ts-expect-error
    _rev: undefined,
    translationKey,
    paths,
    phraseProjectUid: project.uid || 'invalid-project',
    sourceDoc: {
      _type: 'reference',
      _ref: sourceDoc._id,
    },
    sourceLang: sourceDoc.lang,
    sourceSnapshot: getTranslationSnapshot(freshSourceDoc),
    targets,
  }
}
