import { PhrasePluginOptions } from './types'
import { createLangAdapter } from './utils'

export default function definePhraseOptions(
  options: Omit<PhrasePluginOptions, 'langAdapter'>,
): PhrasePluginOptions {
  try {
    // eslint-disable-next-line
    new URL(options.apiEndpoint)
  } catch (error) {
    throw new Error(
      `[sanity-plugin-phrase] The "apiEndpoint" option must be a valid URL. Received: "${options.apiEndpoint}"`,
    )
  }

  return {
    ...options,
    langAdapter: createLangAdapter(options.i18nAdapter),
  }
}
