import { ContextWithProject, EndpointActionTypes } from '../types'
import { getPtdId, getReadableLanguageName } from '../utils'

export default function getPreviewContext(context: ContextWithProject) {
  const languages = [
    { lang: context.request.sourceDoc.lang, isSource: true },
    ...context.request.targetLangs.map((lang) => ({
      lang,
      isSource: false,
    })),
  ]

  function getLangUrl(l: (typeof languages)[0]) {
    const documentId = l.isSource
      ? context.request.sourceDoc._id
      : getPtdId({
          targetLang: l.lang,
          translationKey: context.request.translationKey,
        })
    return `${context.request.pluginOptions.apiEndpoint}?action=${EndpointActionTypes.GET_PREVIEW_URL}&documentId=${documentId}`
  }

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Liberation Sans', Helvetica, Arial, system-ui, sans-serif; font-size: 1.2em; line-height: 1.5; padding: 2em;">
  <h1 style="font-size: 2em; font-weight: 600; font-family: inherit; margin: 0; line-height: 1.25; color: rgb(16, 17, 18)">
    Preview translated content
  </h1>
  <p style="font-size: 1em; font-family: inherit; margin: 0; color: rgb(110, 118, 131)">
    Find the preview for this content by choosing one of the languages below:
  </p>
  <ul style="padding: 0 0 0 1em">
    ${languages
      .map(
        (l, i) => `
      <li style="font-size: 1em; font-family: inherit ${
        i > 0 ? `margin-top: 1em;` : ''
      }" >
        <a
          href="${getLangUrl(l)}"
          target="_blank"
          rel="noopener noreferrer"
          style="font-size: 1em; font-family: inherit; color: rgb(26, 77, 158)"
          >${getReadableLanguageName(l.lang)} ${l.isSource ? '(source)' : ''}</a
        >
      </li>
    `,
      )
      .join('\n')}
  </ul>
</div>`
}
