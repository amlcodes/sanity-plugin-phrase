# Phrase content translation plugin for Sanity.io

⚠️ This plugin only supports document-level translations, such as done by [Sanity's official document-internationalization plugin](https://github.com/sanity-io/document-internationalization). Field-level translations are not supported.

## Installation

```bash
npm install sanity-plugin-phrase

# or pnpm, yarn, bun
```

```ts
// sanity.config.(js|ts)
import {
  phrasePlugin,
  documentInternationalizationAdapter,
} from 'sanity-plugin-phrase'

export default defineConfig({
  // ...
  plugins: [
    // ...
    phrasePlugin({
      targetLanguages: ['es', 'cz'],
      sourceLanguage: 'en',
      region: 'us', // Phrase's Data Center
      pluginApiEndpoint: '/api/phrase', // see below
      // @TODO document adapter
      adapter: documentInternationalizationAdapter({
        languageField: 'language',
        weakReferences: true,
      }),
      projectTemplates: [
        {
          name: '[Sanity.io] default translations',
          templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
        },
        {
          name: '[Sanity.io] urgent translations',
          templateUid: 'gPFIkUzul7o94JrcZZlWM2',
        },
      ],
    }),
  ],
})
```

### `pluginApiEndpoint`

This is the endpoint that the plugin will use to communicate with the Sanity Studio. It is used to authenticate to Phrase's API, receive its webhooks,

## Configuring Phrase

### Creating webhooks

<!-- @TODO -->

### Setting up your Phrase project template(s)

Configure your [Phrase project template(s)](https://support.phrase.com/hc/en-us/articles/5709647439772-Project-Templates-TMS-) with the properties you need for your workflows and team requirements. You can offer users one or more templates to choose from when ordering a new translation.

For the plugin, the most important settings to get right are:

**JSON file import**

- Exclude specific keys (use regexp): `(^|.*\/)(_createdAt|_id|_rev|_type|_updatedAt|_ref|_key|style|_sanityContext|_sanityDocument|_spanMeta|_blockMeta|phraseMeta|_strengthenOnPublish)(^|.*\/)?`
  - You must exclude localization-specific data, like the `language` of a given document if you're using `@sanity/document-internationalization`
  - Include to this any project-specific keys that you don't want to be translated, such as a `slug` for content using the same path across all languages
- Context note: `/_sanityContext`

**Source language**

Currently, this plugin operates from the assumption of having a single source language. The project template(s) must have the same source as the one configured in the plugin's `sourceLanguage`.

**Target languages**

Make sure the languages you choose in Phrase are in sync to what you have in the plugin's configuration.
