import { SanityClient } from 'sanity'
import createAuthedPhraseClient from './createAuthedPhraseClient'
import refreshPtdsFromPhraseData from './refreshPtdsFromPhraseData'
import { Phrase } from './types'

type JobTargetUpdatedWebhook = {
  event: 'JOB_TARGET_UPDATED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobDeletedWebhook = {
  event: 'JOB_DELETED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobAssignedWebhook = {
  event: 'JOB_ASSIGNED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobCreatedWebhook = {
  event: 'JOB_CREATED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type JobStatusChangedWebhook = {
  event: 'JOB_STATUS_CHANGED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

export type PhraseWebhook =
  | JobTargetUpdatedWebhook
  | JobDeletedWebhook
  | JobAssignedWebhook
  | JobCreatedWebhook
  | JobStatusChangedWebhook

export default async function handlePhraseWebhook(
  sanityClient: SanityClient,
  payload: PhraseWebhook,
) {
  const phraseClient = await createAuthedPhraseClient(sanityClient)
  if (
    !payload.event ||
    !(
      [
        'JOB_ASSIGNED',
        'JOB_TARGET_UPDATED',
        'JOB_STATUS_CHANGED',
        'JOB_CREATED',
        'JOB_DELETED',
      ] as PhraseWebhook['event'][]
    ).includes(payload.event)
  ) {
    return 'Invalid webhook payload or ignored event'
  }

  if (payload.event === 'JOB_DELETED') {
    // @TODO: deal with deletions - probably marking status as DELETED_IN_PHRASE
    return true
  }

  if (payload.event === 'JOB_CREATED') {
    // wait ~5s to have all language target documents, PTDs & referenced content in Sanity before proceeding
    await sleep(5000)
  }

  await refreshPtdsFromPhraseData({
    sanityClient,
    phraseClient,
    jobsInWebhook: payload.jobParts || [],
  })

  return true
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
