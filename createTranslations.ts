import { Path } from '@sanity/types'
import { fromString } from '@sanity/util/paths'
import fs from 'fs'
import { createPTDs } from './createPTDs'
import ensureDocNotLocked from './ensureDocNotLocked'
import getDataToTranslate from './getDataToTranslate'
import lockDocument from './lockDocument'
import { phraseClient } from './phraseClient'
import queryFreshDocuments from './queryFreshDocuments'
import { sanityClient } from './sanityClient'
import { SanityDocumentWithPhraseMetadata, TranslationRequest } from './types'
import { getTranslationKey, getTranslationName } from './utils'

export default async function createTranslations(
  request: Omit<TranslationRequest, 'paths'> & { paths?: (Path | string)[] },
) {
  const { sourceDoc, paths: inputPaths, targetLangs, templateUid } = request
  const paths = (inputPaths || [[]]).map((p) =>
    typeof p === 'string' ? fromString(p) : p || [],
  )

  const configuredRequest: TranslationRequest = { ...request, paths }
  const { freshDocuments, freshDocumentsByLang, freshDocumentsById } =
    await queryFreshDocuments(configuredRequest)

  // Before going ahead with Phrase, make sure there's no pending translation
  ensureDocNotLocked({
    ...configuredRequest,
    freshDocuments,
  })

  const { name: translationName, filename } =
    getTranslationName(configuredRequest)

  // And lock it to prevent race conditions
  await lockDocument({
    ...configuredRequest,
    freshDocuments,
  })

  const project = await phraseClient.projects.create({
    name: translationName,
    templateUid,
    targetLangs,
    sourceLang: sourceDoc.lang,
  })
  if (!project.ok || !project.data.uid) {
    // @TODO unlock on error in Phrase
    throw new Error('Failed creating project')
  }
  const projectUid = project.data.uid

  // %%%%% DEBUG %%%%%
  console.log({ project, projectUid })
  fs.writeFileSync(
    'example-data/created-project.json',
    JSON.stringify(project, null, 2),
  )
  // %%%%% DEBUG %%%%%

  const jobsRes = await phraseClient.jobs.create({
    projectUid: projectUid,
    targetLangs: targetLangs,
    filename: filename,
    // @TODO: handle non-object dataToTranslate
    dataToTranslate: getDataToTranslate({
      ...configuredRequest,
      freshDocumentsById,
    }),
  })

  if (!jobsRes.ok || !jobsRes.data?.jobs) {
    // @TODO unlock on error in Phrase
    throw new Error('Failed creating jobs')
  }

  // %%%%% DEBUG %%%%%
  fs.writeFileSync(
    'example-data/created-jobs.json',
    JSON.stringify(jobsRes, null, 2),
  )
  // %%%%% DEBUG %%%%%

  const freshSourceDoc = freshDocumentsById[sourceDoc._id]
  const PTDs = createPTDs({
    ...request,
    project: project.data,
    paths,
    jobs: jobsRes.data.jobs,
    freshDocumentsByLang,
    freshSourceDoc,
  })

  // %%%%% DEBUG %%%%%
  fs.writeFileSync('example-data/PTDs.json', JSON.stringify(PTDs, null, 2))
  // %%%%% DEBUG %%%%%

  const transaction = sanityClient.transaction()
  // Create PTDs in Sanity
  PTDs.forEach((doc) => transaction.createOrReplace(doc))

  // And mark this translation as CREATED
  transaction.patch(freshSourceDoc._id, (patch) => {
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
      [`${basePath}.projectId`]: projectUid,
      [`${basePath}.targetLangs`]: targetLangs,
    })
  })

  fs.writeFileSync(
    'example-data/gitignored/transaction.json',
    JSON.stringify(transaction.toJSON(), null, 2),
  )
  const res = await transaction.commit()
  console.log('\n\n\nFinal transaction res', res)
}
