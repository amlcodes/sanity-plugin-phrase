import { PropsWithChildren, createContext, useContext } from 'react'
import { PhrasePluginOptions } from '../types'

const PluginOptionsContext = createContext<PhrasePluginOptions>({
  apiEndpoint: '',
  phraseRegion: 'eur',
  phraseTemplates: [],
  sourceLang: '',
  supportedTargetLangs: [],
  translatableTypes: [],
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
