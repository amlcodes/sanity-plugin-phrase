import { Effect, pipe } from 'effect'
import { CreateTranslationsInput } from './types'
import createTranslations from './createTranslations'
import { runEffectWithClients } from './createTranslationHelpers'

export default function createMultipleTranslations(
  inputRequest: {
    translations: Omit<
      CreateTranslationsInput,
      'sanityClient' | 'credentials' | 'schemaTypes'
    >[]
  } & Pick<
    CreateTranslationsInput,
    'sanityClient' | 'credentials' | 'schemaTypes'
  >,
) {
  const { translations } = inputRequest
  if (!Array.isArray(translations)) {
    return { status: 400, body: { error: 'Invalid translations set' } } as const
  }

  if (translations.length === 0) {
    return {
      status: 200,
      body: { message: 'No translations to create' },
    } as const
  }

  const program = pipe(
    Effect.forEach(
      translations,
      (t) =>
        createTranslations({
          ...t,
          sanityClient: inputRequest.sanityClient,
          credentials: inputRequest.credentials,
          schemaTypes: inputRequest.schemaTypes,
        }).pipe(Effect.map((res) => ({ res, t }))),
      { concurrency: 2 },
    ),
    Effect.map((results) => {
      const errors = results.filter((r) => r.res.status !== 200)
      const successes = results.filter((r) => r.res.status === 200)

      if (successes.length === 0) {
        return {
          status: 500,
          body: { error: 'All translations failed', errors },
        } as const
      }

      if (errors.length === 0) {
        return {
          status: 200,
          body: { error: 'All translations created', successes },
        } as const
      }

      return {
        status: 207,
        body: {
          error: `${successes.length} translations created and ${errors.length} failed`,
          successes,
          errors,
        },
      } as const
    }),
  )

  return Effect.runPromise(runEffectWithClients(inputRequest, program))
}
