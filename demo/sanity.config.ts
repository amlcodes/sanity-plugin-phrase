import {
  documentInternationalization,
  DocumentInternationalizationMenu,
} from '@sanity/document-internationalization'
import { visionTool } from '@sanity/vision'
import { PHRASE_CONFIG } from 'phraseConfig'
import { defineConfig, SanityDocument } from 'sanity'
import { Iframe, IframeOptions } from 'sanity-plugin-iframe-pane'
import { previewUrl } from 'sanity-plugin-iframe-pane/preview-url'
import { deskTool } from 'sanity/desk'
import {
  apiVersion,
  dataset,
  previewSecretId,
  projectId,
} from '~/lib/sanity.api'
import { getDocPath } from '~/lib/urls'
import {
  injectPhraseIntoSchema,
  isPtdId,
  NOT_PTD,
  phrasePlugin,
} from '~/plugin-dist'
import { schemaTypes } from '~/schemas'
import { LANGUAGES, TRANSLATABLE_SCHEMAS, undraftId } from '~/utils'

function getPreviewUrl(doc: SanityDocument, urlSecret: string) {
  return `${
    window.location.origin
  }/api/draft?pathToRedirect=${encodeURIComponent(
    getDocPath(doc),
  )}&publishedId=${undraftId(doc._id)}&secret=${urlSecret}`
}

const iframeOptions = {
  url: getPreviewUrl,
  urlSecretId: previewSecretId,
  reload: { button: true },
} satisfies IframeOptions

const intlPlugin = documentInternationalization({
  // @ts-expect-error
  supportedLanguages: LANGUAGES,
  schemaTypes: TRANSLATABLE_SCHEMAS,
})

export default defineConfig({
  basePath: '/studio',
  name: 'phrase-sanity-demo',
  title: '[DEMO] Phrase <> Sanity.io plugin',
  projectId,
  dataset,
  schema: {
    types: injectPhraseIntoSchema(schemaTypes, PHRASE_CONFIG),

    templates: (prev) =>
      prev.filter((template) => !TRANSLATABLE_SCHEMAS.includes(template.id)),
  },
  plugins: [
    deskTool({
      // `defaultDocumentNode` is responsible for adding a “Preview” tab to the document pane
      // You can add any React component to `S.view.component` and it will be rendered in the pane
      // and have access to content in the form in real-time.
      // It's part of the Studio's “Structure Builder API” and is documented here:
      // https://www.sanity.io/docs/structure-builder-reference
      defaultDocumentNode: (S, { schemaType }) => {
        return S.document().views([
          // Default form view
          S.view.form(),
          // Preview
          S.view.component(Iframe).options(iframeOptions).title('Preview'),
        ])
      },
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .schemaType('post')
              .title('Posts')
              .child(
                S.documentList()
                  .id('post')
                  .title('Posts')
                  .schemaType('post')
                  .filter(`_type == "post" && ${NOT_PTD}`)
                  .apiVersion(apiVersion),
              ),
          ]),
    }),
    // Add the "Open preview" action
    previewUrl({
      base: '/api/draft',
      requiresSlug: ['post'],
      urlSecretId: previewSecretId,
    }),
    // Vision lets you query your content with GROQ in the studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),

    {
      ...intlPlugin,
      document: {
        ...intlPlugin.document,
        unstable_languageFilter: undefined,
      },
    },

    phrasePlugin(PHRASE_CONFIG),
  ],
  document: {
    unstable_languageFilter: (prev, ctx) => {
      const { schemaType, documentId } = ctx

      return TRANSLATABLE_SCHEMAS.includes(schemaType as any) &&
        documentId &&
        !isPtdId(documentId)
        ? [
            ...prev,
            (props) =>
              DocumentInternationalizationMenu({ ...props, documentId }),
          ]
        : prev
    },
  },
})
