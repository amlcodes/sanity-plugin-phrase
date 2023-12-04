'use client'

import { DocumentBadgeDescription, DocumentBadgeProps } from 'sanity'
import { PhrasePluginOptions, SanityDocumentWithPhraseMetadata } from '../types'
import {
  hasTranslationsUnfinished,
  isPTDDoc,
  isPtdId,
  isTranslatedMainDoc,
  isTranslationCommitted,
} from '../utils'
import { getReadableLanguageName } from '../utils'
import { PhraseMonogram } from './PhraseLogo'

export function createDocumentBadge(pluginOptions: PhrasePluginOptions) {
  return function DocumentBadge(
    props: DocumentBadgeProps,
  ): DocumentBadgeDescription | null {
    if (!pluginOptions.translatableTypes.includes(props.type)) return null

    const source = (props?.draft || props?.published) as
      | SanityDocumentWithPhraseMetadata
      | undefined

    if (isPtdId(props.id)) {
      const title =
        !!source && isPTDDoc(source)
          ? `Content being translated to ${getReadableLanguageName(
              source.phraseMetadata.targetLang.sanity,
            )}`
          : undefined
      return {
        label: 'Phrase Translation',
        title,
        icon: PhraseMonogram,
      }
    }

    const hasOngoingTranslations =
      !!source &&
      isTranslatedMainDoc(source) &&
      hasTranslationsUnfinished(source)

    if (!hasOngoingTranslations) {
      return null
    }

    const ongoing = source.phraseMetadata.translations.filter(
      (t) => !isTranslationCommitted(t),
    )

    return {
      label: `Translation${ongoing.length > 0 ? 's' : ''} ongoing`,
      title:
        ongoing.length === 1 &&
        (ongoing[0].status === 'COMPLETED' || ongoing[0].status === 'CREATED')
          ? `Document being translated to ${ongoing[0].targetLangs
              .map(getReadableLanguageName)
              .join(', ')}`
          : undefined,
      icon: PhraseMonogram,
    }
  }
}
