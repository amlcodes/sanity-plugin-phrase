'use client'

import {
  DocumentBadgeDescription,
  DocumentBadgeProps,
  useDocumentStore,
} from 'sanity'
import { useTMDs } from '../hooks/useTMDs'
import { PhrasePluginOptions, SanityDocumentWithPhraseMetadata } from '../types'
import {
  getReadableLanguageName,
  isPTDDoc,
  isPtdId,
  isTranslationCommitted,
} from '../utils'
import { PhraseMonogram } from './PhraseLogo'

export function createDocumentBadge(pluginOptions: PhrasePluginOptions) {
  return function DocumentBadge(
    props: DocumentBadgeProps,
  ): DocumentBadgeDescription | null {
    const documentStore = useDocumentStore()
    const [TMDs, TMDSLoading] = useTMDs({
      documentStore,
      docId: props.id,
    })

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

    if (!pluginOptions.translatableTypes.includes(props.type) || !TMDSLoading)
      return null

    const ongoing =
      !!source && !!TMDs && TMDs.filter((t) => !isTranslationCommitted(t))

    if (!ongoing || ongoing.length === 0) {
      return null
    }

    return {
      label: `Translation${ongoing.length > 0 ? 's' : ''} ongoing`,
      title: `Document being translated to ${ongoing
        .map((TMD) =>
          TMD.targets.map((t) => getReadableLanguageName(t.lang)).join(', '),
        )
        .join(', ')}`,
      icon: PhraseMonogram,
    }
  }
}
