import { fromString } from '@sanity/util/paths'
import { createPTDs } from './createPTDs'
import ensureDocNotLocked from './ensureDocNotLocked'
import getDataToTranslate from './getDataToTranslate'
import getOrCreateTranslatedDocuments from './getOrCreateTranslatedDocuments'
import lockDocument from './lockDocument'
import { SanityDocumentWithPhraseMetadata, TranslationRequest } from './types'
import { getTranslationKey, getTranslationName, langAdapter } from './utils'
import { CreateTranslationsInput } from './types'

function formatRequest(request: CreateTranslationsInput): TranslationRequest {
  const { paths: inputPaths, targetLangs: inputTargetLangs } = request

  const paths = (
    Array.isArray(inputPaths) && inputPaths.length > 0 ? inputPaths : [[]]
  ).map((p) =>
    typeof p === 'string' ? fromString(p) : p || [],
  ) as TranslationRequest['paths']
  const targetLangs = langAdapter.sanityToCrossSystem(inputTargetLangs)

  return {
    ...request,
    paths,
    targetLangs,
    sourceDoc: {
      ...request.sourceDoc,
      lang: langAdapter.sanityToCrossSystem(request.sourceDoc.lang),
    },
  }
}

export default async function createTranslations(
  inputRequest: CreateTranslationsInput,
) {
  const request = formatRequest(inputRequest)
  const { sourceDoc, targetLangs, paths } = request

  const { freshDocuments, freshDocumentsById } =
    await getOrCreateTranslatedDocuments(request)

  // Before going ahead with Phrase, make sure there's no pending translation
  ensureDocNotLocked({
    ...request,
    freshDocuments,
  })

  // @TODO: ensure revs match - ask user to retry if the document changed during the process

  const { name: translationName, filename } = getTranslationName(request)

  // And lock it to prevent race conditions
  await lockDocument({
    ...request,
    freshDocuments,
  })

  const project = await request.phraseClient.projects.create({
    name: translationName,
    templateUid: request.templateUid,
    targetLangs: langAdapter.crossSystemToPhrase(targetLangs),
    sourceLang: sourceDoc.lang.phrase,
    dateDue: request.dateDue,
  })
  if (!project.ok || !project.data.uid) {
    // @TODO unlock on error in Phrase
    throw new Error('Failed creating project')
  }
  const projectUid = project.data.uid

  // %%%%% DEBUG %%%%%
  console.log({ project, projectUid })
  // fs.writeFileSync(
  //   'example-data/created-project.json',
  //   JSON.stringify(project, null, 2),
  // )
  // %%%%% DEBUG %%%%%

  const jobsRes = await request.phraseClient.jobs.create({
    projectUid,
    filename,
    targetLangs: langAdapter.crossSystemToPhrase(targetLangs),
    // @TODO: handle non-object dataToTranslate
    dataToTranslate: getDataToTranslate({
      ...request,
      freshDocumentsById,
    }),
  })

  if (!jobsRes.ok || !jobsRes.data?.jobs) {
    // @TODO unlock on error in Phrase
    throw new Error('Failed creating jobs')
  }

  // %%%%% DEBUG %%%%%
  // fs.writeFileSync(
  //   'example-data/created-jobs.json',
  //   JSON.stringify(jobsRes, null, 2),
  // )
  // %%%%% DEBUG %%%%%

  const freshSourceDoc = freshDocumentsById[sourceDoc._id]
  const PTDs = createPTDs({
    ...request,
    project: project.data,
    paths,
    jobs: jobsRes.data.jobs,
    freshSourceDoc,
    freshDocuments,
  })

  // %%%%% DEBUG %%%%%
  // fs.writeFileSync('example-data/PTDs.json', JSON.stringify(PTDs, null, 2))
  // %%%%% DEBUG %%%%%

  const transaction = request.sanityClient.transaction()
  // Create PTDs in Sanity
  PTDs.forEach((doc) => transaction.createOrReplace(doc))

  Object.keys(freshDocumentsById).forEach((id) => {
    // And mark this translation as CREATED for each of the source & target documents
    transaction.patch(id, (patch) => {
      patch.setIfMissing({
        phraseMeta: {
          _type: 'phrase.main.meta',
          translations: [],
        },
      } as Pick<SanityDocumentWithPhraseMetadata, 'phraseMeta'>)

      const translationKey = getTranslationKey(paths, sourceDoc._rev)
      const basePath = `phraseMeta.translations[_key == "${translationKey}"]`
      return patch.set({
        [`${basePath}.status`]: 'CREATED',
        [`${basePath}.projectUid`]: projectUid,
        [`${basePath}.targetLangs`]: targetLangs,
      })
    })
  })

  // fs.writeFileSync(
  //   'example-data/gitignored/transaction.json',
  //   JSON.stringify(transaction.toJSON(), null, 2),
  // )
  const res = await transaction.commit()
  console.log('\n\n\nFinal transaction res', res)
}
