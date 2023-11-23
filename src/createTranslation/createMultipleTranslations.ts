import { Effect, pipe } from 'effect'
import { CreateMultipleTranslationsInput } from '~/types'
import { runEffectWithClients } from '../createTranslation/createTranslationHelpers'
import createTranslations from '../createTranslation/createTranslations'

export default function createMultipleTranslations(
  input: CreateMultipleTranslationsInput,
) {
  const { translations } = input
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
          sanityClient: input.sanityClient,
          credentials: input.credentials,
          schemaTypes: input.schemaTypes,
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

  return Effect.runPromise(runEffectWithClients(input, program))
}
