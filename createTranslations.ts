import { Path } from '@sanity/types'
import { fromString, get } from '@sanity/util/paths'
import fs from 'fs'
import { createPTDs } from './createPTDs'
import ensureDocNotLocked from './ensureDocNotLocked'
import lockDocument from './lockDocument'
import { client } from './phraseClient'
import queryFreshDocuments from './queryFreshDocuments'
import { sanityClient } from './sanityClient'
import sanityToPhrase from './sanityToPhrase'
import { TranslationRequest } from './types'
import { getTranslationName, pathToString } from './utils'

export default async function createTranslations(
  request: Omit<TranslationRequest, 'path'> & { path?: Path | string },
) {
  const { sourceDoc, path: inputPath, targetLangs, templateUid } = request
  const path =
    typeof inputPath === 'string' ? fromString(inputPath) : inputPath || []

  const pathKey = pathToString(path)
  const { freshDocuments, freshDocumentsByLang, freshDocumentsById } =
    await queryFreshDocuments(sourceDoc._id)

  // Before going ahead with Phrase, make sure there's no pending translation
  await ensureDocNotLocked(freshDocuments, path)

  const translationName = getTranslationName({ ...request, path })
  const filename = `${translationName}.json`

  // And lock it to prevent race conditions
  await lockDocument({
    freshDocuments,
    path,
    pathKey,
    translationName,
  })

  const project = await client.projects.create({
    name: translationName,
    templateUid,
    targetLangs,
    sourceLang: sourceDoc.lang,
  })
  const projectId = project.uid

  // %%%%% DEBUG %%%%%
  console.log({ project, projectId })
  fs.writeFileSync(
    'example-data/created-project.json',
    JSON.stringify(project, null, 2),
  )
  // %%%%% DEBUG %%%%%

  const document = freshDocumentsById[sourceDoc._id]
  const dataToTranslate = sanityToPhrase(get(document, path))

  const jobsRes = await client.jobs.create({
    projectUid: projectId,
    targetLangs: targetLangs,
    filename: filename,
    dataToTranslate,
  })

  if (!jobsRes) {
    // @TODO unlock on error in Phrase
    throw new Error('Failed creating jobs')
  }

  // %%%%% DEBUG %%%%%
  fs.writeFileSync(
    'example-data/created-jobs.json',
    JSON.stringify(jobsRes, null, 2),
  )
  // %%%%% DEBUG %%%%%

  const PTDs = createPTDs({
    jobs: jobsRes.jobs,
    sourceDoc: document,
    path,
  })
  // %%%%% DEBUG %%%%%
  fs.writeFileSync('example-data/PTDs.json', JSON.stringify(PTDs, null, 2))
  // %%%%% DEBUG %%%%%

  const transaction = sanityClient.transaction()
  // Create PTDs in Sanity
  PTDs.forEach((doc) => transaction.createOrReplace(doc))

  // And
  transaction.patch(document._id, (patch) => {
    patch.setIfMissing({ phraseTranslations: [] })
    return patch.insert(
      'replace',
      `phraseTranslations[${pathToString(path)}]`,
      [
        {
          _type: 'phrase.mainDoc.meta',
          _key: pathKey,
          projectId,
          projectName: translationName,
          filename,
          targetLangs,
          path,
          // @TODO: rethink this status
          status: 'CREATED',
        },
      ],
    )
  })
}
