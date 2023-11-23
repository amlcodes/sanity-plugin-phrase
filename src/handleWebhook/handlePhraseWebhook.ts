import { SanityClient } from 'sanity'
import { Phrase, PhraseCredentialsInput } from '~/types'
import refreshPTDsInPhraseWebhook from '../refreshTranslation/refreshPTDsInPhraseWebhook'
import { sleep } from '../utils'
import markPTDsAsDeletedByWebhook from './markPTDsAsDeletedByWebhook'

type JobTargetUpdatedWebhook = {
  event: 'JOB_TARGET_UPDATED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

export type JobDeletedWebhook = {
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

type ProjectDeletedWebhook = {
  event: 'PROJECT_DELETED'
  timestamp: number
  eventUid: string
  project: Phrase['CreatedProject']
}

export type PhraseWebhook =
  | JobTargetUpdatedWebhook
  | JobDeletedWebhook
  | JobAssignedWebhook
  | JobCreatedWebhook
  | JobStatusChangedWebhook
  | ProjectDeletedWebhook

export default async function handlePhraseWebhook({
  sanityClient,
  payload,
  credentials,
  translatableTypes,
}: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  payload: PhraseWebhook
  translatableTypes: string[]
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
    return {
      status: 400,
      body: { error: 'Invalid webhook payload or ignored event' },
    } as const
  }

  if (payload.event === 'PROJECT_DELETED') {
    // @TODO
    return {
      status: 500,
      body: { error: "Project deletion isn't yet supported" },
    } as const
  }

  if (payload.event === 'JOB_DELETED') {
    return markPTDsAsDeletedByWebhook({
      sanityClient,
      payload,
    })
  }

  if (payload.event === 'JOB_CREATED') {
    // eslint-disable-next-line no-console
    console.info('Waiting for Sanity to be ready before updating PTDs...')

    // wait ~10s to have all language target documents, PTDs & referenced content in Sanity before proceeding
    // 10s is also hopefully enough time for Phrase to finish its initial Machine Translation on the Job
    await sleep(10000)
  }

  return refreshPTDsInPhraseWebhook({
    credentials,
    sanityClient,
    jobsInWebhook: payload.jobParts || [],
    translatableTypes,
  })
}
