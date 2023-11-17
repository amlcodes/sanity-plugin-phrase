import { Effect, pipe } from 'effect'
import { i18nAdapter } from './adapters'
import {
  SanityDocumentWithPhraseMetadata,
  SanityTranslationDocPair,
  TranslationRequest,
} from './types'
import { langAdapter } from './utils'

class AdapterFailedQueryingError {
  readonly _tag = 'AdapterFailedQueryingError'
  // @TODO fine grained errors
}

export default function getOrCreateTranslatedDocuments(
  request: TranslationRequest,
) {
  return pipe(
    Effect.tryPromise({
      try: () => i18nAdapter.getOrCreateTranslatedDocuments(request),
      catch: () => new AdapterFailedQueryingError(),
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

      if (hasBrokenDoc || hasMissingLang) {
        return Effect.fail(new AdapterFailedQueryingError())
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

      return { freshDocumentsById, freshDocuments }
    }),
    Effect.withSpan('getOrCreateTranslatedDocuments'),
  )
}
