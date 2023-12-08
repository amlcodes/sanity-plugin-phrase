import { PortableTextBlock } from 'sanity'
import { parse } from 'parse5'
import { Element, TextNode } from 'parse5/dist/tree-adapters/default'
import { SerializedPtBlock, SerializedPtHtmlTag } from './types'
import { decodeHTML } from 'entities'

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
function autocloseTags(html: string): string {
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

function deserializeBlock(block: SerializedPtBlock): PortableTextBlock {
  const parsed = parse(autocloseTags(block.serializedHtml))
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
