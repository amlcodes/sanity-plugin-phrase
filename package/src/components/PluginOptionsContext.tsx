'use client'

import { PropsWithChildren, createContext, useContext } from 'react'
import { documentInternationalizationAdapter } from '../adapters/document-internationalization'
import { PhrasePluginOptions } from '../types'
import { createLangAdapter } from '../utils/langs'

const defaultAdapter = documentInternationalizationAdapter()

const PluginOptionsContext = createContext<PhrasePluginOptions>({
  apiEndpoint: '',
  phraseRegion: 'eur',
  phraseTemplates: [],
  sourceLang: '',
  supportedTargetLangs: [],
  translatableTypes: [],
  i18nAdapter: defaultAdapter,
  langAdapter: createLangAdapter(defaultAdapter),
  getDocumentPreview: () => '',
})

export function PluginOptionsProvider(
  props: PropsWithChildren<{ pluginOptions: PhrasePluginOptions }>,
) {
  return (
    <PluginOptionsContext.Provider value={props.pluginOptions}>
      {props.children}
    </PluginOptionsContext.Provider>
  )
}

export function usePluginOptions() {
  return useContext(PluginOptionsContext)
}
