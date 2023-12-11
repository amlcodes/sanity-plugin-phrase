import { describe, expect, test } from 'bun:test'
// import { describe, expect, test } from 'vitest'
import decodeFromPhrase, { autoWrapTags } from '../src/decodeFromPhrase'
import encodeToPhrase from '../src/encodeToPhrase'
import { exampleDocuments } from './exampleDocuments'

describe('Sanity -> Phrase -> Sanity: should be equal', () => {
  exampleDocuments.forEach(({ filename, document }) => {
    test(filename, () => {
      expect(document).toStrictEqual(decodeFromPhrase(encodeToPhrase(document)))
    })
  })

  test('autoWrapTags #1', () => {
    expect(
      autoWrapTags('This is a paragraph', {
        _type: 'block',
        _blockMeta: {
          _type: 'block',
          style: 'normal',
          _key: 'c5adde77590e',
        },
        _spanMeta: {
          ec6c9ad23aa8: {
            _type: 'span',
            marks: [],
            _key: 'ec6c9ad23aa8',
          },
        },
        inlineBlocksData: {},
        serializedHtml: 'This is a paragraph',
        markDefs: [],
      }),
    ).toEqual('<s data-key="ec6c9ad23aa8">This is a paragraph</s>')
  })

  test('autoWrapTags #2', () => {
    expect(
      autoWrapTags(
        'This is a paragraph with <s data-key="ec6c9ad23aa8">one valid span inside it</s>',
        {
          _type: 'block',
          _blockMeta: {
            _type: 'block',
            style: 'normal',
            _key: 'c5adde77590e',
          },
          _spanMeta: {
            ec6c9ad23aa8: {
              _type: 'span',
              marks: [],
              _key: 'ec6c9ad23aa8',
            },
            klasd923dpfp: {
              _type: 'span',
              marks: [],
              _key: 'klasd923dpfp',
            },
          },
          inlineBlocksData: {},
          serializedHtml: 'This is a paragraph',
          markDefs: [],
        },
      ),
    ).toEqual(
      '<s data-key="klasd923dpfp">This is a paragraph with </s><s data-key="ec6c9ad23aa8">one valid span inside it</s>',
    )
  })
})
