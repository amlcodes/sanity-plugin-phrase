import { SanityClient } from 'sanity'
import refreshPTDsInPhraseWebhook from './refreshPTDsInPhraseWebhook'
import { Phrase, PhraseCredentialsInput } from './types'
import { sleep } from './utils'

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

export default async function handlePhraseWebhook({
  sanityClient,
  payload,
  credentials,
}: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  payload: PhraseWebhook
}) {
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

  return refreshPTDsInPhraseWebhook({
    credentials,
    sanityClient,
    jobsInWebhook: payload.jobParts || [],
  })
}
