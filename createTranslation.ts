import { Path, SanityDocument } from '@sanity/types'
import { fromString, get, numEqualSegments, toString } from '@sanity/util/paths'
import fs from 'fs'
import { Job } from './types/CreatedJobs'
import { client } from './phraseClient'
import { sanityClient } from './sanityClient'
import ensureDocNotLocked from './ensureDocNotLocked'
import lockDocument from './lockDocument'

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

async function createTranslation({
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
  const dataToTranslate = path ? get(document, path) : document

  const translationName = getTranslationName(document, path)

  const pathKey = pathToString(path)
  // Before going ahead with Phrase, make sure there's no pending translation
  const { docIds } = await ensureDocNotLocked(document, path)
  // And lock it to prevent race conditions
  await lockDocument({
    docIds,
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
  fs.writeFileSync('created-project.json', JSON.stringify(project, null, 2))
  // const project = JSON.parse(fs.readFileSync('created-project.json', 'utf-8'))
  // const projectId = project.uid

  const filename = `${translationName}.json`

  // @TODO: make configurable
  const targetLangs = project.targetLangs

  const jobsRes = await client.jobs.create({
    projectUid: projectId,
    targetLangs: targetLangs,
    filename: filename,
    dataToTranslate,
  })
  if (!jobsRes) {
    throw new Error('Failed creating jobs')
  }

  fs.writeFileSync('created-jobs.json', JSON.stringify(jobsRes, null, 2))
  const PTDs = createPTDs(jobsRes.jobs, document, path)
  fs.writeFileSync('PTDs.json', JSON.stringify(PTDs, null, 2))

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

createTranslation({
  templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
  document: {
    _createdAt: '2023-10-17T21:50:58Z',
    _id: 'db16b562-bd32-42fd-8c39-35eb3bd7ddb7',
    _rev: 'T1lOlhDpTBo4zpIQo1p1SW',
    _type: 'post',
    _updatedAt: '2023-10-17T21:50:58Z',
    author: {
      _ref: 'd0d00e98-81e5-40d1-aed4-f2bdd5b085bf',
      _type: 'reference',
    },
    body: [
      {
        _key: '752a5e9caa86',
        _type: 'block',
        children: [
          {
            _key: '5514cfa700ca0',
            _type: 'span',
            marks: [],
            text: 'The integration of Phrase.com with Sanity.io presents an exciting development for content creators and developers. Phrase.com is a powerful translation management system (TMS) that helps streamline the localization process, while Sanity.io is a popular headless CMS or content platform designed to offer flexibility and scalability. Together, this integration enables seamless translation workflows within the Sanity.io environment.',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
    language: 'en',
    slug: {
      _type: 'slug',
      current: 'the-new-sanity-io-phrase-integration',
    },
    title: 'The new Sanity.io Phrase integration',
  },
})
