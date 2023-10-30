import { Path, SanityDocument } from '@sanity/types'
import { fromString, get, toString } from '@sanity/util/paths'
import fs from 'fs'
import ensureDocNotLocked from './ensureDocNotLocked'
import lockDocument from './lockDocument'
import { client } from './phraseClient'
import queryFreshDocuments from './queryFreshDocuments'
import { sanityClient } from './sanityClient'
import sanityToPhrase from './sanityToPhrase'
import { Job } from './types/CreatedJobs'

function pathToString(path: Path) {
  if (path.length === 0) return 'root'

  return toString(path)
}

// @TODO create friendlier names
function getTranslationName(sanityDocument: SanityDocument, path: Path) {
  return `[Sanity.io] ${sanityDocument._type} ${pathToString(path)} ${
    sanityDocument._id
  }`
}

/**
 * PTD: Parallel Translation Document
 */
function createPTDs(jobs: Job[], sanityDocument: SanityDocument, path: Path) {
  const jobCollections = jobs.reduce(
    (acc, job) => ({
      ...acc,
      [job.targetLang]: [...(acc[job.targetLang] || []), job],
    }),
    {} as Record<string, Job[]>,
  )

  const PTDs = Object.entries(jobCollections).map(([targetLang, jobs]) => {
    return {
      ...sanityDocument,
      // @TODO: can we rely on ID paths or should we split by `-`?
      _id: `phrase.translation.${sanityDocument._id}.${targetLang}`,
      phrase: {
        _type: 'phrase.ptdMetadata',
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

export default async function createTranslations({
  document,
  inputPath,
  templateUid,
}: {
  document: SanityDocument
  inputPath?: Path | string
  templateUid: string
}) {
  const path =
    typeof inputPath === 'string' ? fromString(inputPath) : inputPath || []

  const translationName = getTranslationName(document, path)

  const pathKey = pathToString(path)
  // Before going ahead with Phrase, make sure there's no pending translation
  const { freshDocuments, freshDocumentsByLang } = await queryFreshDocuments(
    document._id,
  )
  await ensureDocNotLocked(freshDocuments, path)
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
  })
  const projectId = project.uid
  console.log({ project, projectId })
  fs.writeFileSync(
    'example-data/created-project.json',
    JSON.stringify(project, null, 2),
  )
  // const project = JSON.parse(fs.readFileSync('example-data/created-project.json', 'utf-8'))
  // const projectId = project.uid

  const filename = `${translationName}.json`

  // @TODO: make configurable
  const targetLangs = project.targetLangs

  const dataToTranslate = sanityToPhrase(get(document, path))
  const jobsRes = await client.jobs.create({
    projectUid: projectId,
    targetLangs: targetLangs,
    filename: filename,
    dataToTranslate,
  })
  if (!jobsRes) {
    throw new Error('Failed creating jobs')
  }

  fs.writeFileSync(
    'example-data/created-jobs.json',
    JSON.stringify(jobsRes, null, 2),
  )
  const PTDs = createPTDs(jobsRes.jobs, document, path)
  fs.writeFileSync('example-data/PTDs.json', JSON.stringify(PTDs, null, 2))

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
          _type: 'phrase.mainMetadata',
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
