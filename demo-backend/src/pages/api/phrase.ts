// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient } from '@sanity/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createInternalHandler } from 'sanity-plugin-phrase/backend'
import { definePhraseOptions } from 'sanity-plugin-phrase/config'
import { documentInternationalizationAdapter } from 'sanity-plugin-phrase/adapters'

export const writeToken = process.env.SANITY_WRITE_TOKEN || ''

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2022-11-15',
  useCdn: false,
  perspective: 'published',
})

const phraseHandler = createInternalHandler({
  phraseCredentials: {
    userName: process.env.PHRASE_USER_NAME || '',
    password: process.env.PHRASE_PASSWORD || '',
    region: (process.env.PHRASE_REGION as any) || 'eu',
  },
  sanityClient: client.withConfig({ token: writeToken }),
  pluginOptions: definePhraseOptions({
    i18nAdapter: documentInternationalizationAdapter(),
    translatableTypes: ['post'],
    supportedTargetLangs: ['es', 'pt'],
    sourceLang: 'en',
    apiEndpoint: '/api/phrase',
    phraseRegion: 'us',
    phraseTemplates: [
      {
        templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
        label: '[Sanity.io] Default template',
      },
    ],
  }),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method?.toUpperCase() === 'OPTIONS') {
    res.status(200).json({})
    return
  }

  if (!req.method || req.method.toUpperCase() !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const phraseRes = await phraseHandler(req.body)
  const resBody = await phraseRes.json().catch(() => {})

  Array.from(phraseRes.headers.entries()).forEach((value) => {
    res.setHeader(value[0], value[1])
  })
  res.status(phraseRes.status).json(resBody)
}