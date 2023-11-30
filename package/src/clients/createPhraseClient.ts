import { Fetcher } from '../openapi-typescript-fetch'
import { operations, paths } from './phraseOpenAPI'
import { ContentInPhrase } from '../types'

export type PhraseDatacenterRegion = 'us' | 'eur'

export const createPhraseClient = (
  region: PhraseDatacenterRegion,
  token?: string,
) => {
  const fetcher = Fetcher.for<paths>()
  const baseUrl = getPhraseBaseUrl(region)

  fetcher.configure({
    baseUrl,
    init: {
      headers: {
        Authorization: `ApiToken ${token}`,
      },
    },
  })

  const createJobFetcher = fetcher
    .path('/api2/v1/projects/{projectUid}/jobs')
    .method('post')
    .create()

  return {
    login: fetcher.path('/api2/v1/auth/login').method('post').create(),
    projects: {
      create: fetcher
        .path('/api2/v2/projects/applyTemplate/{templateUid}')
        .method('post')
        .create(),
      delete: fetcher
        .path('/api2/v1/projects/{projectUid}')
        .method('delete')
        .create({ purge: true }),
    },
    jobs: {
      getPreview: async (
        props: operations['filePreviewJob']['parameters']['path'],
      ) => {
        const res = await fetch(
          `${baseUrl}/api2/v1/projects/${props.projectUid}/jobs/${props.jobUid}/preview`,
          {
            headers: {
              Authorization: `ApiToken ${token}`,
            },
          },
        )
        if (!res.ok) throw new Error('Failed to get preview')

        const json = JSON.parse(await res.text()) as ContentInPhrase
        return json
      },
      getOriginal: async (
        props: operations['getOriginalFile']['parameters']['path'],
      ) => {
        const res = await fetch(
          `${baseUrl}/api2/v1/projects/${props.projectUid}/jobs/${props.jobUid}/original`,
          {
            headers: {
              Authorization: `ApiToken ${token}`,
            },
          },
        )
        if (!res.ok) throw new Error('Failed to get preview')

        const json = JSON.parse(await res.text()) as ContentInPhrase
        return json
      },
      create: (
        props: Parameters<typeof createJobFetcher>[0] & {
          targetLangs: string[]
          filename: string
          dataToTranslate: ContentInPhrase
        },
      ) => {
        const blob = new Blob([JSON.stringify(props.dataToTranslate)], {
          type: 'application/json',
        })

        return createJobFetcher(
          {
            projectUid: props.projectUid,
          },
          {
            body: blob,
            method: 'POST',
            headers: {
              Memsource: JSON.stringify({
                targetLangs: props.targetLangs,
                useProjectFileImportSettings: true,
              }),
              'Content-Disposition': `inline; filename="${props.filename}"`,
              'Content-Type': 'application/octet-stream',
            },
          },
        )
      },
    },
  }
}

export type PhraseClient = ReturnType<typeof createPhraseClient>

export function getPhraseBaseUrl(region: string) {
  return `https://${region === 'us' ? 'us.' : ''}cloud.memsource.com/web`
}
