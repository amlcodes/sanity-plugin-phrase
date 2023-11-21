import { Effect, pipe } from 'effect'
import { i18nAdapter } from './adapters'
import {
  ContextWithFreshDocuments,
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { getTranslationName, langAdapter } from './utils'

type StoredError = {
  adapter?: unknown
  known?: 'hasBrokenDoc' | 'hasMissingLang' | 'sourceDocMissing'
}

class AdapterFailedQueryingError {
  readonly _tag = 'AdapterFailedQueryingError'
  readonly error: StoredError

  constructor(error: StoredError) {
    this.error = error
  }
}

export default function getOrCreateTranslatedDocuments(
  request: TranslationRequest,
) {
  return pipe(
    Effect.tryPromise({
      try: () => i18nAdapter.getOrCreateTranslatedDocuments(request),
      catch: (error) => new AdapterFailedQueryingError({ adapter: error }),
    }),
    Effect.tap(() =>
      Effect.logInfo(
        '[getOrCreateTranslatedDocuments] Got fresh documents from Phrase',
      ),
    ),
    Effect.flatMap((freshDocumentsSource) => {
      const docs = Array.isArray(freshDocumentsSource)
        ? freshDocumentsSource
        : []
      const hasBrokenDoc = docs.some(
        (item) =>
          typeof item !== 'object' || !item || (!item.draft && !item.published),
      )
      const hasMissingLang = request.targetLangs.some(
        (lang) => !docs.some((d) => d?.lang === lang.sanity),
      )
      const sourceDocMissing = !docs.some(
        (d) => (d.draft || d.published)?._id === request.sourceDoc._id,
      )

      let knownError: StoredError['known']
      if (hasBrokenDoc) knownError = 'hasBrokenDoc'
      if (hasMissingLang) knownError = 'hasMissingLang'
      if (sourceDocMissing) knownError = 'sourceDocMissing'

      if (knownError) {
        return Effect.fail(knownError)
      }

      return Effect.succeed(freshDocumentsSource)
    }),
    Effect.map((freshDocumentsSource) => {
      const freshDocuments = freshDocumentsSource.map(
        (d) =>
          ({
            ...d,
            lang: langAdapter.sanityToCrossSystem(d.lang),
          }) as SanityTranslationDocPair,
      )

      const freshDocumentsById = freshDocuments.reduce(
        (acc, t) => {
          if (t.draft) acc[t.draft._id] = t.draft
          if (t.published) acc[t.published._id] = t.published

          return acc
        },
        {} as Record<string, SanityDocumentWithPhraseMetadata>,
      )

      const freshSourceDoc = freshDocumentsById[request.sourceDoc._id]
      return {
        freshDocumentsById,
        freshDocuments,
        request,
        freshSourceDoc,
        ...getTranslationName(request, freshSourceDoc),
      } as ContextWithFreshDocuments
    }),
    Effect.withSpan('getOrCreateTranslatedDocuments'),
  )
}
