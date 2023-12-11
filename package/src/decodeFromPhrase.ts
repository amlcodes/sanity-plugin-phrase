import { PortableTextBlock } from 'sanity'
import { parse } from 'parse5'
import { Element, TextNode } from 'parse5/dist/tree-adapters/default'
import { SerializedPtBlock, SerializedPtHtmlTag } from './types'
import { decodeHTML } from 'entities'
import { makeKeyAndIdFriendly } from './utils'
import { uuid } from '@sanity/uuid'

/**
 * Make content stored & translated in Phrase usable in Sanity.
 *
 * Refer to `encodeToPhrase` for more details on the transformations ran.
 */
export default function decodeFromPhrase<C = unknown>(content: C): C {
  if (Array.isArray(content)) {
    return content.map((c) => decodeFromPhrase(c)) as C
  }

  if (typeof content === 'object' && content !== null) {
    if ('_type' in content && content._type === 'block') {
      return deserializeBlock(content as any as SerializedPtBlock) as C
    }

    return Object.fromEntries(
      Object.entries(content).map(([key, value]) => [
        key,
        decodeFromPhrase(value),
      ]),
    ) as C
  }

  if (typeof content === 'string') {
    return decodeStringFromPhrase(content) as C
  }

  return content
}

function decodeStringFromPhrase(str: string) {
  return decodeHTML(str)
}

const tags = Object.values(SerializedPtHtmlTag)

/**
 * Sligthly reduces the possibility of error states for PT blocks by auto-closing tags
 * not yet properly closed in the Phrase editor.
 *
 * Assumptions:
 * - No nested tags
 * - No self-closing tags
 */
function autoCloseTags(html: string): string {
  if (!html) return html

  return html.replace(
    new RegExp(`<(${tags.join('|')})[^>]*>[^<]*`, 'g'),
    (match, tag, index, newHtml) => {
      const subsequentStr = newHtml.slice(index + match.length)
      if (!subsequentStr.startsWith(`</${tag}>`)) {
        return `${match}</${tag}>`
      }

      return match
    },
  )
}

const HTML_TAG_START_REGEX = new RegExp(`<(?:${tags.join('|')})[^>]*>`, 'g')

/**
 * Sometimes, Phrase returns strings without the HTML tags applied.
 *
 * This gets solved with QA steps before the project is finished, but in the meantime, we want to
 * make sure `deserializeBlock` will be able to create keys
 *
 * @TODO refactor to cover whole string, not only first tag
 */
export function autoWrapTags(html: string, block: SerializedPtBlock): string {
  if (html.startsWith('<')) return html

  const allTags = Array.from(html.matchAll(HTML_TAG_START_REGEX)).map(
    (m) => m[0],
  )
  const firstTagIndex = allTags[0] ? html.indexOf(allTags[0]) : -1
  const [unwrappedContent, wrappedContent] = [
    firstTagIndex >= 0 ? html.slice(0, firstTagIndex) : html,
    firstTagIndex >= 0 ? html.slice(firstTagIndex) : '',
  ]

  const usedKeys = allTags.map((t) => t.match(/data-key="([^"]+)"/)?.[1] || '')
  const allSpanKeys = Object.keys(block._spanMeta || {})
  const spanKey =
    allSpanKeys.find((k) => !usedKeys.includes(k)) ||
    makeKeyAndIdFriendly(uuid())

  return `<${SerializedPtHtmlTag.SPAN} data-key="${spanKey}">${unwrappedContent}</${SerializedPtHtmlTag.SPAN}>${wrappedContent}`
}

function deserializeBlock(block: SerializedPtBlock): PortableTextBlock {
  const parsed = parse(autoWrapTags(autoCloseTags(block.serializedHtml), block))
  const html = parsed.childNodes[0] as Element
  const body = html?.childNodes?.find((n) => n.nodeName === 'body') as Element

  const children = (body?.childNodes || []).flatMap((n) => {
    if (n.nodeName === SerializedPtHtmlTag.SPAN) {
      const key = (n.attrs || []).find((a) => a.name === 'data-key')?.value
      const text = decodeStringFromPhrase(
        (n.childNodes[0] as TextNode)?.value || '',
      )
      const spanMeta = block._spanMeta[key || '']
      if (!spanMeta) return []

      return {
        ...spanMeta,
        text,
      }
    }
    if (n.nodeName === SerializedPtHtmlTag.BLOCK) {
      const key = (n.attrs || []).find((a) => a.name === 'data-key')?.value
      const blockMeta = block.inlineBlocksData[key || '']
      if (!blockMeta) return []

      return blockMeta
    }

    return []
  })

  return {
    ...block._blockMeta,
    markDefs: block.markDefs,
    children,
  }
}
