import { Effect, pipe } from 'effect'
import { ContextWithJobs, PhraseJobInfo, SanityTMD, TMDTarget } from '../types'
import { makeKeyAndIdFriendly, sortJobsByWorkflowLevel } from '../utils'
import { targetPathInTMD } from '../utils/paths'
import { createPTDs } from './createPTDs'

class PersistJobsAndCreatePTDsError {
  readonly _tag = 'PersistJobsAndCreatePTDs'

  constructor(
    readonly error: unknown,
    readonly context: ContextWithJobs,
  ) {
    console.error(`[PersistJobsAndCreatePTDs] ${error}`, error)
  }
}

export default function persistJobsAndCreatePTDs(context: ContextWithJobs) {
  try {
    const { transaction, PTDs } = getTransaction(context)

    return pipe(
      Effect.tryPromise({
        try: () =>
          transaction.commit({
            returnDocuments: false,
            autoGenerateArrayKeys: true,
          }),
        catch: (error) => new PersistJobsAndCreatePTDsError(error, context),
      }),
      Effect.map(() => PTDs),
      Effect.tap(() =>
        Effect.logInfo('[persistJobsAndCreatePTDs] Successfully created PTDs'),
      ),
      Effect.withLogSpan('persistJobsAndCreatePTDs'),
    )
  } catch (error) {
    return Effect.fail(new PersistJobsAndCreatePTDsError(error, context))
  }
}

function getTransaction(context: ContextWithJobs) {
  const { request, activeTMD, jobs, project } = context
  const PTDs = createPTDs(context)

  const transaction = request.sanityClient.transaction()

  PTDs.forEach((doc) => transaction.createOrReplace(doc))

  transaction.patch(activeTMD._id, (patch) => {
    const metadata: Pick<SanityTMD<'NEW'>, 'status' | 'phraseProjectUid'> = {
      status: 'status' in project ? (project.status as 'NEW') : 'NEW',
      phraseProjectUid: project.uid,
    }

    const updatedTargets = activeTMD.targets.map(
      (target): Pick<TMDTarget<'NEW'>, 'jobs' | '_key'> => {
        const targetJobs = jobs.filter(
          (job) => job.targetLang && job.targetLang === target.lang.phrase,
        )
        const formattedJobs: PhraseJobInfo[] = targetJobs.map((j) => ({
          _type: 'phrase.job',
          _key: makeKeyAndIdFriendly(j.uid || 'invalid-job'),
          uid: j.uid,
          status: j.status,
          dateDue: j.dateDue,
          dateCreated: j.dateCreated,
          workflowLevel: j.workflowLevel,
          workflowStep: j.workflowStep,
          providers: j.providers,
        }))

        return {
          _key: target._key,
          jobs: sortJobsByWorkflowLevel(formattedJobs),
        }
      },
    )

    return patch
      .set(metadata)
      .set(
        Object.fromEntries(
          updatedTargets.map((t) => [
            `${targetPathInTMD(t._key)}.jobs`,
            t.jobs,
          ]),
        ),
      )
  })

  return { transaction, PTDs }
}
