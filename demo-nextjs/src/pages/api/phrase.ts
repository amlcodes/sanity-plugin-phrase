// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { PHRASE_CONFIG } from 'phraseConfig'
import { createInternalHandler } from 'sanity-plugin-phrase/backend'
import { writeToken } from '~/lib/sanity.api'
import { client } from '~/lib/sanity.client'

const phraseHandler = createInternalHandler({
  phraseCredentials: {
    userName: process.env.PHRASE_USER_NAME || '',
    password: process.env.PHRASE_PASSWORD || '',
    region: (process.env.PHRASE_REGION as any) || 'eu',
  },
  sanityClient: client.withConfig({ token: writeToken }),
  pluginOptions: PHRASE_CONFIG,
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

  if (
    !req.method ||
    (req.method.toUpperCase() !== 'POST' && req.method.toUpperCase() !== 'GET')
  ) {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const phraseRes = await phraseHandler(
    req.method.toUpperCase() === 'POST' ? req.body : req.query,
  )
  const resBody = await phraseRes.json().catch(() => {})

  Array.from(phraseRes.headers.entries()).forEach((value) => {
    res.setHeader(value[0], value[1])
  })
  res.status(phraseRes.status).json(resBody)
}
