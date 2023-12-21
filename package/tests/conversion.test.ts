// import { describe, expect, test } from 'bun:test'
import { describe, expect, test } from 'vitest'
import decodeFromPhrase, { autoWrapTags } from '../src/decodeFromPhrase'
import encodeToPhrase from '../src/encodeToPhrase'
import { exampleDocuments } from './exampleDocuments'

describe.only('Sanity -> Phrase -> Sanity: should be equal', () => {
  exampleDocuments.forEach(({ filename, document }) => {
    test(filename, () => {
      expect(document).toStrictEqual(decodeFromPhrase(encodeToPhrase(document)))
    })
  })

  test('[autoWrapTags] fully unwrapped', () => {
    expect(
      autoWrapTags('This is a paragraph', {
        ec6c9ad23aa8: {
          _type: 'span',
          marks: [],
          _key: 'ec6c9ad23aa8',
        },
      }),
    ).toEqual('<s data-key="ec6c9ad23aa8">This is a paragraph</s>')
  })

  test('[autoWrapTags] unwrapped, wrapped', () => {
    expect(
      autoWrapTags(
        'This is a paragraph with <s data-key="ec6c9ad23aa8">one valid span inside it</s>',
        {
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
      ),
    ).toEqual(
      '<s data-key="klasd923dpfp">This is a paragraph with </s><s data-key="ec6c9ad23aa8">one valid span inside it</s>',
    )
  })

  test('[autoWrapTags] wrapped, unwrapped', () => {
    expect(
      autoWrapTags(
        '<s data-key="ec6c9ad23aa8">This is a paragraph starts wrapped</s> and finishes unwrapped',
        {
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
      ),
    ).toEqual(
      '<s data-key="ec6c9ad23aa8">This is a paragraph starts wrapped</s><s data-key="klasd923dpfp"> and finishes unwrapped</s>',
    )
  })

  test('[autoWrapTags] unwrapped, wrapped, unwrapped, wrapped, unwrapped', () => {
    expect(
      autoWrapTags(
        'This is a paragraph with <s data-key="span2">wrapped 1</s> unwrapped 2<s data-key="span4">wrapped 2</s> unwrapped 3',
        {
          span1: {
            _type: 'span',
            marks: [],
            _key: 'span1',
          },
          span2: {
            _type: 'span',
            marks: [],
            _key: 'span2',
          },
          span3: {
            _type: 'span',
            marks: [],
            _key: 'span3',
          },
          span4: {
            _type: 'span',
            marks: [],
            _key: 'span4',
          },
          span5: {
            _type: 'span',
            marks: [],
            _key: 'span5',
          },
        },
      ),
    ).toEqual(
      '<s data-key="span1">This is a paragraph with </s><s data-key="span2">wrapped 1</s><s data-key="span3"> unwrapped 2</s><s data-key="span4">wrapped 2</s><s data-key="span5"> unwrapped 3</s>',
    )
  })
})
