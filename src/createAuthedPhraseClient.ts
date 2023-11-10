import { SanityClient } from 'sanity'
import { createPhraseClient } from './createPhraseClient'
import getOrSetPhraseToken from './getOrSetPhraseToken'

export default async function createAuthedPhraseClient(
  sanityClient: SanityClient,
) {
  const { token, region } = await getOrSetPhraseToken(sanityClient)
  return createPhraseClient(region, token)
}
