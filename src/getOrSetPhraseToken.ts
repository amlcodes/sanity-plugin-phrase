import { CREDENTIALS_DOC_ID } from './constants'
import {
  PhraseDatacenterRegion,
  createPhraseClient,
} from './createPhraseClient'
import { sanityClient } from './sanityClient'
import { PhraseCredentialsDocument } from './types'

export default async function getOrSetPhraseToken(
  region: PhraseDatacenterRegion,
) {
  const phraseCredentials =
    await sanityClient.fetch<PhraseCredentialsDocument | null>(
      '*[_id == $id][0]',
      {
        id: CREDENTIALS_DOC_ID,
      },
    )

  if (!phraseCredentials?.userName || !phraseCredentials?.password) {
    throw new Error('Phrase credentials not found')
  }

  if (tokenStillValid(phraseCredentials)) {
    return phraseCredentials.token as string
  }

  const freshCredentials = await getFreshCredentials(region, {
    userName: phraseCredentials.userName,
    password: phraseCredentials.password,
  })

  // Persist the new token in Sanity for future requests
  await sanityClient.createOrReplace({
    ...phraseCredentials,
    token: freshCredentials.token,
    expires: freshCredentials.expires,
  })

  return freshCredentials.token as string
}

const ONE_HOUR = 1000 * 60 * 60

async function getFreshCredentials(
  region: PhraseDatacenterRegion,
  credentials: Pick<
    Required<PhraseCredentialsDocument>,
    'userName' | 'password'
  >,
) {
  const unauthedClient = createPhraseClient(region)
  const res = await unauthedClient.login({
    password: credentials.password,
    userName: credentials.userName,
  })

  if (!res.ok || !res.data.token) {
    throw new Error(`Failed to login to Phrase (${res.status})`, {
      cause: res.statusText,
    })
  }

  return res.data
}

function tokenStillValid(credentials: PhraseCredentialsDocument) {
  return (
    credentials.token &&
    credentials.expires &&
    // Must have at least one more hour of validity, else we'll refresh beforehand to avoid errors
    // @TODO: it seems Phrase always return the same token while it doesn't expire - what does this mean for workflows running in the middle of refreshes?
    new Date(credentials.expires) > new Date(Date.now() + ONE_HOUR)
  )
}
