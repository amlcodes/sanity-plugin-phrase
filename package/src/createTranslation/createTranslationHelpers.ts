import { SanityClient } from '@sanity/client'
import { Context, Effect, pipe } from 'effect'
import { EffectfulPhraseClient } from '../clients/EffectfulPhraseClient'
import { EffectfulSanityClient } from '../clients/EffectfulSanityClient'
import { PhraseClient } from '../clients/createPhraseClient'
import getAuthedPhraseClient from '../clients/getAuthedPhraseClient'
import { CreateTranslationsInput, TranslationRequest } from '../types'
import { getTranslationKey } from '../utils'
import { formatInputDiffs } from '../utils/paths'

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

export function formatRequest(
  request: CreateTranslationsInput,
  phraseClient: PhraseClient,
): TranslationRequest {
  const { diffs: inputDiffs, targetLangs: inputTargetLangs } = request
  const { langAdapter } = request.pluginOptions

  const diffs = formatInputDiffs(inputDiffs)

  const targetLangs = langAdapter.sanityToCrossSystem(
    // Don't allow translating to the same language as the source
    inputTargetLangs.filter(
      (lang) => !!lang && request.sourceDoc.lang !== lang,
    ),
  )

  const sourceDoc: TranslationRequest['sourceDoc'] = {
    ...request.sourceDoc,
    lang: langAdapter.sanityToCrossSystem(request.sourceDoc.lang),
  }
  return {
    ...request,
    diffs,
    targetLangs,
    sourceDoc,
    phraseClient,
    translationKey: getTranslationKey(diffs, sourceDoc._rev),
    translationFilename: `${request.translationName}.json`,
  }
}
