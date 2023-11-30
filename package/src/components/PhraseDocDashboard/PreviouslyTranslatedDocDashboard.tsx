'use client'

import { Code, Spinner } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useClient, useEditState } from 'sanity'
import getStaleTranslations from '../../staleTranslations/getStaleTranslations'
import { SanityMainDoc, StaleResponse, TranslationRequest } from '../../types'
import { SANITY_API_VERSION, undraftId } from '../../utils'
import DocDashboardCard from '../DocDashboardCard'
import { usePluginOptions } from '../PluginOptionsContext'

export default function PreviouslyTranslatedDocDashboard({
  document,
  docLang,
}: {
  document: SanityMainDoc
  docLang: string
}) {
  const sanityClient = useClient({ apiVersion: SANITY_API_VERSION })
  const pluginOptions = usePluginOptions()
  const { sourceLang, supportedTargetLangs, langAdapter } = pluginOptions
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
      pluginOptions,
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
    <DocDashboardCard title="This document has been translated in the past">
      <Code>{JSON.stringify(staleness, null, 2)}</Code>
    </DocDashboardCard>
  )
}
