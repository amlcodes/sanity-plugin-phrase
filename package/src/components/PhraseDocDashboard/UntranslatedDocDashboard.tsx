'use client'

import { Button, Text } from '@sanity/ui'
import { SanityDocumentWithPhraseMetadata } from '../../types'
import DocDashboardCard from '../DocDashboardCard'
import { usePluginOptions } from '../PluginOptionsContext'

export default function UntranslatedDocDashboard(props: {
  document: SanityDocumentWithPhraseMetadata
  openDialog: () => void
}) {
  const { sourceLang, i18nAdapter } = usePluginOptions()
  const docLang = i18nAdapter.getDocumentLang(props.document)
  const documentId = props.document._id

  if (!docLang || docLang !== sourceLang) return null

  const dialogId = `phrase-translation-dialog--${documentId}`

  return (
    <DocDashboardCard
      title="Untranslated document"
      subtitle={
        <Text>
          This document has not been translated to any of the target languages
          yet.
        </Text>
      }
      collapsible={false}
      headerActions={
        <Button
          text="Translate in Phrase"
          tone="primary"
          // disabled={state === 'loading'}
          onClick={props.openDialog}
          aria-haspopup="dialog"
          aria-controls={dialogId}
        />
      }
    >
      {null}
    </DocDashboardCard>
  )
}
