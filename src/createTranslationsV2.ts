import { Effect, pipe } from 'effect'
import { EffectfulSanityClient } from './EffectfulSanityClient'
import getAuthedPhraseClient from './getAuthedPhraseClient'
import { CreateTranslationsInput } from './types'

export default function createTranslations(request: CreateTranslationsInput) {
  return Effect.runPromise(
    pipe(
      Effect.provideService(
        getAuthedPhraseClient(request.credentials),
        EffectfulSanityClient,
        EffectfulSanityClient.of(request.sanityClient),
      ),
    ),
  )
}
