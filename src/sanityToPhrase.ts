import { PortableTextTextBlock } from '@sanity/types'
import { SerializedPtBlock, SerializedPtHtmlTag } from './types'

/**
 * How it works:
 * - renders every span as <s data-key="SPAN_KEY">
 * - renders every inline block as <c-b data-key="BLOCK_KEY">
 * - extract inline blocks & spans' meta as JSON outside of the HTML
 */
function serializeBlock(block: PortableTextTextBlock): SerializedPtBlock {
  const { children = [], markDefs = [], ...metadata } = block

  /**
   * Machine-oriented meta fields for the block: _type, style, markDefs, listItem, level.
   * `_` prefix indicates it's ignored by Phrase - will be sent and imported back as is.
   *
   * @docs https://github.com/portabletext/portabletext#block
   */
  const _blockMeta = metadata

  /**
   * Maps span keys to their full metadata, beyond their text content.
   * `_` prefix indicates it's ignored by Phrase - will be sent and imported back as is.
   * Translatable, human-readable data that could exist in a span's metadata is found in `markDefs`.
   *
   * @docs https://github.com/portabletext/portabletext#span
   */
  const _spanMeta = children.reduce((metaAcc, span) => {
    if (span._type !== 'span') return metaAcc

    return {
      ...metaAcc,
      [span._key]: {
        ...span,
        text: undefined,
      },
    }
  }, {})

  /**
   * Similar to spanMeta, but for inline blocks.
   * Analyzed by Phrase for human-readable properties like an inline image's `alt`.
   *
   * @docs https://github.com/portabletext/portabletext#custom-blocks
   */
  const inlineBlocksData = children.reduce((metaAcc, block) => {
    if (block._type === 'span') return metaAcc

    return {
      ...metaAcc,
      [block._key]: block,
    }
  }, {})

  const serializedHtml = children
    .map((child) => {
      if (child._type === 'span') {
        return `<${SerializedPtHtmlTag.SPAN} data-key="${child._key}">${child.text}</${SerializedPtHtmlTag.SPAN}>`
      }

      return `<${SerializedPtHtmlTag.BLOCK} data-key="${child._key}"></${SerializedPtHtmlTag.BLOCK}>`
    })
    .join('\n')

  return {
    _type: 'block',
    _blockMeta,
    _spanMeta,
    inlineBlocksData,
    serializedHtml,

    /** Analyzed by Phrase for human-readable properties like a link's `title` */
    markDefs,
  }
}

export default function sanityToPhrase<C = unknown>(content: C): C {
  if (Array.isArray(content)) {
    return content.map((c) => sanityToPhrase(c)) as C
  }

  if (typeof content === 'object' && content !== null) {
    if ('_type' in content && content._type === 'block') {
      return serializeBlock(content as any as PortableTextTextBlock) as C
    }

    return Object.fromEntries(
      Object.entries(content).map(([key, value]) => [
        key,
        sanityToPhrase(value),
      ]),
    ) as C
  }

  return content
}
