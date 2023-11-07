import {
  PhraseDatacenterRegion,
  createPhraseClient,
} from './createPhraseClient'
import getOrSetPhraseToken from './getOrSetPhraseToken'

export default async function createAuthedPhraseClient(
  region: PhraseDatacenterRegion,
) {
  const phraseToken = await getOrSetPhraseToken(region)
  return createPhraseClient(region, phraseToken)
}
