import { Path } from '@sanity/types'
import { fromString, get } from '@sanity/util/paths'
import fs from 'fs'
import { createPTDs } from './createPTDs'
import ensureDocNotLocked from './ensureDocNotLocked'
import lockDocument from './lockDocument'
import { phraseClient } from './phraseClient'
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
  const configuredRequest = { ...request, path }
  const { freshDocuments, freshDocumentsByLang, freshDocumentsById } =
    await queryFreshDocuments(configuredRequest)

  // Before going ahead with Phrase, make sure there's no pending translation
  await ensureDocNotLocked(freshDocuments, path)

  const translationName = getTranslationName(configuredRequest)
  const filename = `${translationName}.json`

  // And lock it to prevent race conditions
  await lockDocument({
    freshDocuments,
    path,
    pathKey,
    translationName,
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
  const projectId = project.data.uid

  // %%%%% DEBUG %%%%%
  console.log({ project, projectId })
  fs.writeFileSync(
    'example-data/created-project.json',
    JSON.stringify(project, null, 2),
  )
  // %%%%% DEBUG %%%%%

  const document = freshDocumentsById[sourceDoc._id]
  const dataToTranslate = sanityToPhrase(get(document, path))

  const jobsRes = await phraseClient.jobs.create({
    projectUid: projectId,
    targetLangs: targetLangs,
    filename: filename,
    // @TODO: handle non-object dataToTranslate
    dataToTranslate: {
      ...dataToTranslate,
      _sanityContext:
        '<div><h1>Translate me!</h1> <p>Find the preview for this content by clicking below:</p> <p><a style="display: inline-block; background: papayawhip; padding: 0.5em 1em;" href="https://mulungood.com">See preview</a></p>',
      // @TODO: what other fields must we remove?
      phraseTranslations: undefined,
    },
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

  const PTDs = createPTDs({
    ...request,
    path,
    jobs: jobsRes.data.jobs,
    freshDocumentsByLang,
    freshSourceDoc: freshDocumentsById[sourceDoc._id],
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
