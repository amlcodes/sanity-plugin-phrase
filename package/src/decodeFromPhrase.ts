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

const WRAPPED_KNOWN_TAGS_REGEX = new RegExp(
  `<(${tags.join('|')})[^>]*>([^<]*|<(?!/\\1>))*</\\1>`,
  'g',
)

/**
 * Sometimes, Phrase returns strings without the HTML tags applied.
 *
 * This gets solved with QA steps before the project is finished, but in the meantime, we want to
 * make sure `deserializeBlock` will be able to create keys
 */
export function autoWrapTags(
  html: string,
  spanMeta: SerializedPtBlock['_spanMeta'],
): string {
  const iterator = html.matchAll(WRAPPED_KNOWN_TAGS_REGEX)
  const allWrapped: {
    html: string
    start: number
    end: number
  }[] = []

  for (const match of iterator) {
    const start = match.index || 0
    allWrapped.push({ html: match[0], start, end: start + match[0].length - 1 })
  }

  const allSpanKeys = Object.keys(spanMeta || {})
  const usedKeys = allWrapped.map(
    (t) => t.html.match(/data-key="([^"]+)"/)?.[1] || '',
  )
  const availableKeys = allSpanKeys.filter((k) => !usedKeys.includes(k))

  // If nothing is wrapped, wrap the whole thing
  if (allWrapped.length <= 0) {
    return `<s data-key="${
      availableKeys.shift() || makeKeyAndIdFriendly(uuid())
    }">${html}</s>`
  }

  const disconnectedIndexes = allWrapped.flatMap(
    ({ start, end }, index, all) => {
      const previousWrapped = all[index - 1]

      const disconnected: {
        start: number
        end: number
      }[] = []

      // #1 There's no previous wrapped tag
      if (!previousWrapped && start > 0) {
        disconnected.push({ start: 0, end: start - 1 })
      }

      // #2 There's a gap between the previously wrapped content and the current one
      if (previousWrapped && previousWrapped.start + 1 !== start) {
        disconnected.push({
          start: previousWrapped.start + previousWrapped.html.length,
          end: start - 1,
        })
      }

      const nextWrapped = all[index + 1]

      // #3 There's no next wrapped tag and this isn't the last content
      if (!nextWrapped && end < html.length - 1) {
        disconnected.push({ start: end + 1, end: html.length - 1 })
      }

      // #4 If there's a gap between the current wrapped content and the next one,
      // it'll be covered in #2 of the future iteration

      return disconnected
    },
  )

  const reconnected = disconnectedIndexes.map((d) => {
    const key = availableKeys.shift() || makeKeyAndIdFriendly(uuid())
    return {
      ...d,
      html: `<s data-key="${key}">${html.slice(d.start, d.end + 1)}</s>`,
    }
  })

  const finalParts = [...reconnected, ...allWrapped].sort(
    (a, b) => a.start - b.start,
  )

  return finalParts.map((part) => part.html).join('')
}

function deserializeBlock(block: SerializedPtBlock): PortableTextBlock {
  const parsed = parse(
    autoWrapTags(autoCloseTags(block.serializedHtml), block._spanMeta),
  )
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
