import { PhraseDatacenterRegion } from '../src/clients/createPhraseClient'

export const testCredentials = {
  userName: process.env.PHRASE_USER_NAME || '',
  password: process.env.PHRASE_PASSWORD || '',
  region: (process.env.PHRASE_REGION as PhraseDatacenterRegion) || 'eu',
}
