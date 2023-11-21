import { SanityClient } from '@sanity/client'
import { Context, Duration, Effect, Schedule, pipe } from 'effect'
import { EffectfulPhraseClient } from './EffectfulPhraseClient'
import { EffectfulSanityClient } from './EffectfulSanityClient'
import { PhraseClient } from './createPhraseClient'
import getAuthedPhraseClient from './getAuthedPhraseClient'
import { CreateTranslationsInput, TranslationRequest } from './types'

import { fromString } from '@sanity/util/paths'
import { langAdapter } from './utils'

export function runEffectWithClients<E = unknown, A = unknown>(
  input: Pick<CreateTranslationsInput, 'credentials' | 'sanityClient'>,
  effectToRun: Effect.Effect<SanityClient | PhraseClient, E, A>,
) {
  return pipe(
    Effect.provideService(
      getAuthedPhraseClient(input.credentials),
      EffectfulSanityClient,
      EffectfulSanityClient.of(input.sanityClient),
    ),
    Effect.flatMap((phraseClient) =>
      Effect.provide(
        effectToRun,
        Context.empty().pipe(
          Context.add(
            EffectfulSanityClient,
            EffectfulSanityClient.of(input.sanityClient),
          ),
          Context.add(
            EffectfulPhraseClient,
            EffectfulPhraseClient.of(phraseClient),
          ),
        ),
      ),
    ),
  )
}

export const retrySchedule = pipe(
  // Exponential backoff with 100ms initial delay and 4x growth factor
  Schedule.exponential(Duration.millis(100), 4),
  // At most 1 second between retries
  Schedule.either(Schedule.spaced(Duration.seconds(1.5))),
  // Include the time elapsed so far
  Schedule.compose(Schedule.elapsed),
  // And use it to stop retrying after a total of 15 seconds have elapsed
  Schedule.whileOutput(Duration.lessThanOrEqualTo(Duration.seconds(10))),
)

export function createResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // @TODO: CORS?
      // 'Access-Control-Allow-Origin': '*',
    },
  })
}

export function formatRequest(
  request: CreateTranslationsInput,
  phraseClient: PhraseClient,
): TranslationRequest {
  const { paths: inputPaths, targetLangs: inputTargetLangs } = request

  const paths = (
    Array.isArray(inputPaths) && inputPaths.length > 0 ? inputPaths : [[]]
  ).map((p) =>
    typeof p === 'string' ? fromString(p) : p || [],
  ) as TranslationRequest['paths']
  const targetLangs = langAdapter.sanityToCrossSystem(
    // Don't allow translating to the same language as the source
    inputTargetLangs.filter(
      (lang) => !!lang && request.sourceDoc.lang !== lang,
    ),
  )

  return {
    ...request,
    paths,
    targetLangs,
    sourceDoc: {
      ...request.sourceDoc,
      lang: langAdapter.sanityToCrossSystem(request.sourceDoc.lang),
    },
    phraseClient,
  }
}
