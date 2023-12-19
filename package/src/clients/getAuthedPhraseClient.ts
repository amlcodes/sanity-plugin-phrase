import { uuid } from '@sanity/uuid'
import { Effect, pipe } from 'effect'
import { PhraseCredentialsDocument, PhraseCredentialsInput } from '../types'
import { CREDENTIALS_DOC_ID, ONE_HOUR } from '../utils'
import { UnknownPhraseClientError } from './EffectfulPhraseClient'
import {
  EffectfulSanityClient,
  SanityCreateOrReplaceError,
  SanityFetchError,
} from './EffectfulSanityClient'
import { PhraseClient, createPhraseClient } from './createPhraseClient'

class InvalidPhraseCredentialsError {
  readonly _tag = 'InvalidPhraseCredentialsError'
}

type LoginPayload = Awaited<ReturnType<PhraseClient['login']>>
type SuccessfulLoginPayload = Omit<LoginPayload['data'], 'token'> & {
  token: string
}

const getFreshToken = (credentials: PhraseCredentialsInput) => {
  const unauthedClient = createPhraseClient(credentials.region)
  return pipe(
    Effect.tryPromise({
      try: () =>
        unauthedClient.login({
          password: credentials.password,
          userName: credentials.userName,
        }),
      catch: (error) => {
        if (
          typeof error === 'object' &&
          error &&
          'status' in error &&
          error.status === 401
        ) {
          return new InvalidPhraseCredentialsError()
        }
        return new UnknownPhraseClientError(error)
      },
    }),
    Effect.flatMap((res) => {
      if (!res.ok || !res.data.token) {
        return Effect.fail(new InvalidPhraseCredentialsError())
      }

      return Effect.succeed(res.data as SuccessfulLoginPayload)
    }),
  )
}

const savePhraseToken = (payload: SuccessfulLoginPayload) =>
  pipe(
    EffectfulSanityClient,
    Effect.flatMap((sanityClient) => {
      const document: PhraseCredentialsDocument = {
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        _rev: uuid(),
        _id: CREDENTIALS_DOC_ID,
        _type: CREDENTIALS_DOC_ID,
        expires: payload.expires,
        token: payload.token,
      }
      return Effect.tryPromise({
        try: () =>
          sanityClient.createOrReplace(document, { returnDocuments: false }),
        catch: () => new SanityCreateOrReplaceError(),
      })
    }),
  )

export default function getAuthedPhraseClient(
  credentials: PhraseCredentialsInput,
) {
  return pipe(
    EffectfulSanityClient,
    Effect.flatMap((sanityClient) =>
      Effect.tryPromise({
        try: () =>
          sanityClient.fetch<PhraseCredentialsDocument | null>(
            '*[_id == $id][0]',
            {
              id: CREDENTIALS_DOC_ID,
            },
          ),
        catch: () =>
          new SanityFetchError('*[_id == $id][0]', { id: CREDENTIALS_DOC_ID }),
      }),
    ),
    Effect.tap(() =>
      Effect.logInfo(
        '[getAuthedPhraseClient] Fetched Phrase credentials document',
      ),
    ),
    Effect.flatMap((phraseCredentials) => {
      if (tokenStillValid(phraseCredentials)) {
        return Effect.succeed(phraseCredentials.token as string)
      }

      return pipe(
        getFreshToken(credentials),
        Effect.tap(() =>
          Effect.logInfo('[getAuthedPhraseClient] Got fresh token from Phrase'),
        ),
        Effect.tap((loginPayload) => savePhraseToken(loginPayload)),
        Effect.tap(() =>
          Effect.logInfo('[getAuthedPhraseClient] Saved fresh token to Sanity'),
        ),
        Effect.flatMap((loginPayload) => Effect.succeed(loginPayload.token)),
      )
    }),
    Effect.map((token) => createPhraseClient(credentials.region, token)),
    Effect.withLogSpan('getAuthedPhraseClient'),
  )
}

function tokenStillValid(
  credentials: PhraseCredentialsDocument | null,
): credentials is PhraseCredentialsDocument {
  return !!(
    credentials?.token &&
    credentials.expires &&
    // Must have at least one more hour of validity, else we'll refresh beforehand to avoid errors
    new Date(credentials.expires) > new Date(Date.now() + ONE_HOUR)
  )
}
