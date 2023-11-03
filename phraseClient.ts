import { Fetcher } from 'openapi-typescript-fetch'
import { operations, paths } from './types/phraseOpenAPI'
import { ContentInPhrase } from './types'

const createPhraseClient = (region: 'us' | 'eur', token?: string) => {
  const fetcher = Fetcher.for<paths>()
  const BASE_URL = `https://${
    region === 'us' ? 'us.' : ''
  }cloud.memsource.com/web`

  fetcher.configure({
    baseUrl: BASE_URL,
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
    projects: {
      create: fetcher
        .path('/api2/v2/projects/applyTemplate/{templateUid}')
        .method('post')
        .create(),
    },
    jobs: {
      getPreview: async (
        props: operations['filePreviewJob']['parameters']['path'],
      ) => {
        const res = await fetch(
          `${BASE_URL}/api2/v1/projects/${props.projectUid}/jobs/${props.jobUid}/preview`,
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
      create: async (
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

export const phraseClient = createPhraseClient('us', process.env.PHRASE_TOKEN)
