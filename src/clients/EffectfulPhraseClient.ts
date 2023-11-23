import { Context } from 'effect'
import { PhraseClient } from './createPhraseClient'

export class UnknownPhraseClientError {
  readonly _tag = 'UnknownPhraseClientError'
  constructor(readonly error: unknown) {}
}

// @TODO make effectful?
export const EffectfulPhraseClient = Context.Tag<PhraseClient>('@phrase/client')
