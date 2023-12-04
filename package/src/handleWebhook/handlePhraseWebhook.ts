import { SanityClient } from 'sanity'
import refreshPTDsInPhraseWebhook from '../refreshTranslation/refreshPTDsInPhraseWebhook'
import { Phrase, PhraseCredentialsInput, PhrasePluginOptions } from '../types'
import { sleep } from '../utils'
import markPTDsAsDeletedByWebhook from './markPTDsAsDeletedByWebhook'
import updateTMDFromProjectWebhook from './updateTMDFromProjectWebhook'

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

type JobDueDateChangedWebhook = {
  event: 'JOB_DUE_DATE_CHANGED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
}

type PreTranslationFinishedWebhook = {
  event: 'PRE_TRANSLATION_FINISHED'
  timestamp: number
  eventUid: string
  jobParts: Phrase['JobInWebhook'][]
  metadata: unknown
}

export type ProjectStatusChangedWebhook = {
  event: 'PROJECT_STATUS_CHANGED'
  timestamp: number
  eventUid: string
  project: Phrase['ProjectInWebhook']
}

export type ProjectDeletedWebhook = Omit<
  ProjectStatusChangedWebhook,
  'event'
> & {
  event: 'PROJECT_DELETED'
}

export type ProjectMetadataUpdatedWebhook = Omit<
  ProjectStatusChangedWebhook,
  'event'
> & {
  event: 'PROJECT_METADATA_UPDATED'
}

export type ProjectDueDateChangedWebhook = Omit<
  ProjectStatusChangedWebhook,
  'event'
> & {
  event: 'PROJECT_DUE_DATE_CHANGED'
}

export type PhraseWebhook =
  | JobTargetUpdatedWebhook
  | JobDeletedWebhook
  | JobAssignedWebhook
  | JobCreatedWebhook
  | JobStatusChangedWebhook
  | JobDueDateChangedWebhook
  | PreTranslationFinishedWebhook
  | ProjectDeletedWebhook
  | ProjectStatusChangedWebhook
  | ProjectMetadataUpdatedWebhook
  | ProjectDueDateChangedWebhook

export default async function handlePhraseWebhook({
  sanityClient,
  payload,
  credentials,
  pluginOptions,
}: {
  sanityClient: SanityClient
  credentials: PhraseCredentialsInput
  payload: PhraseWebhook
  pluginOptions: PhrasePluginOptions
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
        'JOB_DUE_DATE_CHANGED',
        'PRE_TRANSLATION_FINISHED',
        'PROJECT_STATUS_CHANGED',
        'PROJECT_DELETED',
        'PROJECT_METADATA_UPDATED',
        'PROJECT_DUE_DATE_CHANGED',
      ] as PhraseWebhook['event'][]
    ).includes(payload.event)
  ) {
    return {
      status: 400,
      body: { error: 'Invalid webhook payload or ignored event' },
    } as const
  }

  if (
    payload.event === 'PROJECT_DELETED' ||
    payload.event === 'PROJECT_STATUS_CHANGED' ||
    payload.event === 'PROJECT_METADATA_UPDATED' ||
    payload.event === 'PROJECT_DUE_DATE_CHANGED'
  ) {
    return updateTMDFromProjectWebhook({
      sanityClient,
      payload,
    })
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

    // wait ~1s to have all language target documents, PTDs & referenced content in Sanity before proceeding
    // We don't need to wait on Phrase to finish its initial Machine Translation on the Job, as that's covered by the PRE_TRANSLATION_FINISHED hook
    await sleep(1000)
  }

  return refreshPTDsInPhraseWebhook({
    credentials,
    sanityClient,
    jobsInWebhook: payload.jobParts || [],
    pluginOptions,
  })
}
