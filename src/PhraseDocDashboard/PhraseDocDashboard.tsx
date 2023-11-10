import { StringFieldProps, useFormValue } from 'sanity'
import { i18nAdapter } from '../adapters'
import { SanityDocumentWithPhraseMetadata, TranslationRequest } from '../types'
import { langAdapter, undraftId } from '../utils'
import OngoingTranslationsDocDashboard from './OngoingTranslationsDocDashboard'
import PreviouslyTranslatedDocDashboard from './PreviouslyTranslatedDocDashboard'
import PtdDocDashboard from './PtdDashboard'
import UntranslatedDocDashboard from './UntranslatedDocDashboard'

export default function PhraseDocDashboard(props: StringFieldProps) {
  const document = useFormValue([]) as SanityDocumentWithPhraseMetadata

  const docLang = i18nAdapter.getDocumentLang(document)

  if (!document || !docLang) return null

  if (!document.phraseMeta) {
    return <UntranslatedDocDashboard />
  }

  if (document.phraseMeta._type === 'phrase.ptd.meta') {
    return (
      <PtdDocDashboard document={document} ptdMetadata={document.phraseMeta} />
    )
  }

  const sourceDoc: TranslationRequest['sourceDoc'] = {
    _id: undraftId(document._id),
    _rev: document._rev,
    _type: document._type,
    lang: langAdapter.sanityToCrossSystem(docLang),
  }
  const ongoingTranslations = document.phraseMeta.translations?.filter(
    (translations) => translations.status !== 'COMPLETED',
  )

  if (ongoingTranslations?.length) {
    return (
      <OngoingTranslationsDocDashboard
        ongoingTranslations={ongoingTranslations}
        sourceDoc={sourceDoc}
      />
    )
  }

  return <PreviouslyTranslatedDocDashboard />
}
