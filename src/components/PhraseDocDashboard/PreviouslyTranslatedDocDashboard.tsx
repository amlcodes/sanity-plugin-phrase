import { Card, Code, Heading, Spinner } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useClient, useEditState } from 'sanity'
import getStaleTranslations from '../../staleTranslations/getStaleTranslations'
import { SanityMainDoc, StaleResponse, TranslationRequest } from '../../types'
import { SANITY_API_VERSION, langAdapter, undraftId } from '../../utils'
import { usePluginOptions } from '../PluginOptionsContext'

export default function PreviouslyTranslatedDocDashboard({
  document,
  docLang,
}: {
  document: SanityMainDoc
  docLang: string
}) {
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const { sourceLang, supportedTargetLangs, translatableTypes } =
    usePluginOptions()
  const sourceId = document.phraseMetadata.translations[0]?.sourceDoc?._id
  const isSource = docLang === sourceLang
  const { draft, published, ready } = useEditState(
    undraftId(isSource ? document._id : sourceId) || '',
    document._type,
  )
  const freshSourceDoc = draft || published
  const sourceDoc =
    freshSourceDoc &&
    ({
      _id: freshSourceDoc?._id,
      _type: freshSourceDoc?._type,
      _rev: freshSourceDoc?._rev,
      lang: langAdapter.sanityToCrossSystem(docLang),
    } as TranslationRequest['sourceDoc'])
  const [staleness, setStaleness] = useState<StaleResponse | undefined>()

  async function getStaleness() {
    if (!sourceDoc) return

    const res = await getStaleTranslations({
      sourceDocs: [sourceDoc],
      sanityClient,
      translatableTypes,
      targetLangs: supportedTargetLangs,
    })
    const newStaleness = res.find((r) => r.sourceDoc?._id === sourceDoc._id)
    setStaleness(newStaleness)
  }

  useEffect(
    () => {
      getStaleness()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceDoc],
  )

  if (!ready) {
    return <Spinner />
  }

  return (
    <Card paddingX={3} padding={4} border radius={2}>
      <Heading as="h2">This document has been translations in progress</Heading>
      <Code>{JSON.stringify(staleness, null, 2)}</Code>
    </Card>
  )
}
