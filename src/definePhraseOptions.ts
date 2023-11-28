import { PhrasePluginOptions } from './types'
import { createLangAdapter } from './utils'

export default function definePhraseOptions(
  options: Omit<PhrasePluginOptions, 'langAdapter'>,
): PhrasePluginOptions {
  return {
    ...options,
    langAdapter: createLangAdapter(options.i18nAdapter),
  }
}
