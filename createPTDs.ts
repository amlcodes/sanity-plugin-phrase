import { SanityDocument } from '@sanity/types'
import { Job, SanityTranslationDocPair, TranslationRequest } from './types'

/**
 * PTD: Parallel Translation Document
 */
export function createPTDs({
  jobs,
  sourceDoc,
  path,
  freshDocumentsByLang,
}: TranslationRequest & {
  jobs: Job[]
  sourceDoc: SanityDocument
  freshDocumentsByLang: Record<string, SanityTranslationDocPair>
}) {
  const jobCollections = jobs.reduce(
    (acc, job) => ({
      ...acc,
      [job.targetLang]: [...(acc[job.targetLang] || []), job],
    }),
    {} as Record<string, Job[]>,
  )

  const PTDs = Object.entries(jobCollections).map(([targetLang, jobs]) => {
    const targetLangDoc =
      freshDocumentsByLang[targetLang]?.draft ||
      freshDocumentsByLang[targetLang]?.published ||
      sourceDoc

    // @TODO: for content in `path`, use `sourceDoc` instead as we'd rather have the original language as the reference in previews for linguists.
    // Will need some sort of deep merging - how does `@sanity/mutator` does it?
    // TDD, lots of tests needed if doing from scratch
    // const test = new Document(targetLangDoc)
    // const mutation = new Mutation({
    //   mutations: [
    //     {
    //       patch: {
    //         // id: sourceDoc._id,
    //         id: targetLangDoc._id,
    //         set: {
    //           [arrayToJSONMatchPath(path)]: get(sourceDoc, path),
    //         },
    //       },
    //     },
    //   ],
    // })
    // console.log("Applied: ", test.applyIncoming(mutation))
    // test.

    return {
      ...targetLangDoc,
      // @TODO: can we rely on ID paths or should we split by `-`?
      _id: `phrase.translation.${sourceDoc._id}.${targetLang}`,
      phrase: {
        _type: 'phrase.ptd.meta',
        path,
        jobs: jobs.map((j) => ({
          _type: 'phrase.job',
          _key: j.uid,
          uid: j.uid,
          status: j.status,
          dateDue: j.dateDue,
          dateCreated: j.dateCreated,
          workflowLevel: j.workflowLevel,
          workflowStep: j.workflowStep,
          providers: j.providers,
        })),
        targetLang,
        filename: jobs[0].filename,
        sourceFileUid: jobs[0].sourceFileUid,
        dateCreated: jobs[0].dateCreated,
      },
    }
  })

  return PTDs
}
