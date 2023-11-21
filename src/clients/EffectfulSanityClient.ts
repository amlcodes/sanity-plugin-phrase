import { QueryParams } from '@sanity/client'
import { Context } from 'effect'
import { type SanityClient as SanityClientDef } from 'sanity'

export class SanityFetchError {
  readonly _tag = 'SanityFetchError'
  constructor(
    readonly query: string,
    readonly params?: QueryParams,
  ) {}
}

export class SanityCreateOrReplaceError {
  readonly _tag = 'SanityCreateOrReplaceError'
}

// @TODO make effectful
export const EffectfulSanityClient =
  Context.Tag<SanityClientDef>('@sanity/client')
