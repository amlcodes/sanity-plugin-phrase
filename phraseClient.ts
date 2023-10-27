import { CreatedJobs } from './types/CreatedJobs'
import { CreatedProject } from './types/CreatedProject'

const createPhraseClient = (region: 'us' | 'eur', token?: string) => {
  const BASE_URL = `https://${
    region === 'us' ? 'us.' : ''
  }cloud.memsource.com/web/api2/v1`

  function request<M extends 'GET' | 'POST' | undefined = 'GET'>({
    method = 'GET',
    endpoint,
    // body,
    ...requestOptions
  }: {
    method?: M
    endpoint: string
    // body: M extends 'POST' ? Record<string, any> : never
  } & Omit<RequestInit, 'method'>) {
    return fetch(`${BASE_URL}/${endpoint}`, {
      ...requestOptions,
      method,
      headers: {
        ...(requestOptions.headers || {}),
        // 'Content-Type': 'application/json',
        Authorization: `ApiToken ${token}`,
      },
    })
  }

  return {
    projects: {
      create: async (props: { name: string; templateUid: string }) => {
        const res = await request({
          method: 'POST',
          endpoint: `projects/applyTemplate/${props.templateUid}`,
          body: JSON.stringify({
            name: props.name,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
        if (res.status !== 201) {
          throw new Error('Project creation failed')
        }
        return (await res.json()) as CreatedProject
      },
    },
    jobs: {
      create: async (props: {
        projectUid: string
        targetLangs: string[]
        filename: string
        dataToTranslate: unknown
      }) => {
        const blob = new Blob([JSON.stringify(props.dataToTranslate)], {
          type: 'application/json',
        })

        // Construct a File object from the Blob
        const file = new File([blob], 'data.json', {
          type: 'application/octet-stream',
        })
        const res = await request({
          method: 'POST',
          endpoint: `projects/${props.projectUid}/jobs`,
          body: file,
          headers: {
            Memsource: JSON.stringify({
              targetLangs: props.targetLangs,
              useProjectFileImportSettings: true,
            }),
            'Content-Disposition': `inline; filename="${props.filename}"`,
            'Content-Type': 'application/octet-stream',
          },
        })
        if (res.status !== 201) {
          throw new Error(
            `Job creation failed (status ${res.status} ${
              res.statusText
            } - ${await res.text()})`,
          )
        }
        return (await res.json()) as CreatedJobs
      },
    },
  }
}

export const client = createPhraseClient('us', process.env.PHRASE_TOKEN)
