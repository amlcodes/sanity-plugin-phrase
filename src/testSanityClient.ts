import { createClient } from '@sanity/client'

export const testSanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2023-10-26',
  useCdn: false,
  perspective: 'raw',
})
