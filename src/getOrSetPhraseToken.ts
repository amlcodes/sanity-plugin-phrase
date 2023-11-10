import { SanityClient } from 'sanity'
import { createPhraseClient } from './createPhraseClient'
import { PhraseCredentialsDocument } from './types'
import { CREDENTIALS_DOC_ID } from './utils'

export default async function getOrSetPhraseToken(sanityClient: SanityClient) {
  const phraseCredentials =
    await sanityClient.fetch<PhraseCredentialsDocument | null>(
      '*[_id == $id][0]',
      {
        id: CREDENTIALS_DOC_ID,
      },
    )

  if (
    !phraseCredentials?.userName ||
    !phraseCredentials?.password ||
    !phraseCredentials?.region
  ) {
    throw new Error('Phrase credentials not found')
  }

  if (tokenStillValid(phraseCredentials)) {
    return {
      token: phraseCredentials.token as string,
      region: phraseCredentials.region,
    }
  }

  const freshCredentials = await getFreshCredentials({
    region: phraseCredentials.region,
    userName: phraseCredentials.userName,
    password: phraseCredentials.password,
  })

  // Persist the new token in Sanity for future requests
  await sanityClient.createOrReplace({
    ...phraseCredentials,
    token: freshCredentials.token,
    expires: freshCredentials.expires,
  })

  return {
    token: freshCredentials.token as string,
    region: phraseCredentials.region,
  }
}

const ONE_HOUR = 1000 * 60 * 60

async function getFreshCredentials(
  credentials: Pick<
    Required<PhraseCredentialsDocument>,
    'userName' | 'password' | 'region'
  >,
) {
  const unauthedClient = createPhraseClient(credentials.region)
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
