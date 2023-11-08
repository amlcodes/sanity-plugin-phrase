import createAuthedPhraseClient from './createAuthedPhraseClient'
import { PhraseDatacenterRegion } from './createPhraseClient'
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

type PhraseWebhook =
  | JobTargetUpdatedWebhook
  | JobDeletedWebhook
  | JobAssignedWebhook
  | JobCreatedWebhook
  | JobStatusChangedWebhook

export default async function handlePhraseWebhook(
  region: PhraseDatacenterRegion,
  payload: PhraseWebhook,
) {
  const phraseClient = await createAuthedPhraseClient(region)
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

  if (payload.event === 'JOB_CREATED') {
    // @TODO: do we need to deal with creations or can we depend entirely on `createPTDs`?
    return
  }

  if (payload.event === 'JOB_DELETED') {
    // @TODO: deal with deletions - probably marking status as DELETED_IN_PHRASE
    return
  }

  await refreshPtdsFromPhraseData({
    phraseClient,
    jobsInWebhook: payload.jobParts || [],
  })
}
