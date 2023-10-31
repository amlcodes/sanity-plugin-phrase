import { describe, expect, test } from 'bun:test'
// import { describe, expect, test } from 'vitest'
import { mergeDocs } from '../utils'
import { exampleDocuments } from './exampleDocuments'

const docEn = {
  _id: 'en-id',
  _rev: 'en-rev',
  _type: 'en-type',
  _createdAt: 'en-createdAt',
  _updatedAt: 'en-updatedAt',
  language: 'en',
  slug: {
    _type: 'slug',
    current: 'the-new-sanity-io-phrase-integration',
  },
  title: 'EN Title',
  body: [
    {
      _key: 'block-1',
      _type: 'block',
      children: [
        {
          _key: '680b067c1713',
          _type: 'span',
          marks: [],
          text: 'EN block #1',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
    {
      _key: 'block-2',
      _type: 'block',
      children: [
        {
          _key: 'c2f7d17ad0a4',
          _type: 'span',
          marks: [],
          text: 'EN block #2',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
    {
      _key: 'block-3',
      _type: 'block',
      children: [
        {
          _key: 'c2f7d17ad0a4',
          _type: 'span',
          marks: [],
          text: 'EN block #3',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ],
}

const docPt: any = {
  _id: 'pt.db16b562-bd32-42fd-8c39-35eb3bd7ddb7',
  _rev: 'pt-rev',
  _type: 'pt-type',
  _createdAt: 'pt-createdAt',
  _updatedAt: 'pt-updatedAt',
  language: 'pt',
  title: 'PT Title',
  body: [
    {
      _key: 'block-1',
      _type: 'block',
      children: [
        {
          _key: '680b067c1713',
          _type: 'span',
          marks: [],
          text: 'PT block #1',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
    {
      _key: 'block-2',
      _type: 'block',
      children: [
        {
          _key: 'c2f7d17ad0a4',
          _type: 'span',
          marks: [],
          text: 'PT block #2',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ],
}

describe('Document merging', () => {
  test('manual merge | entire document', () => {
    expect(mergeDocs(docPt, docEn, [])).toStrictEqual({
      ...docEn,
      _id: docPt._id,
      _rev: docPt._rev,
      _type: docPt._type,
    })
  })

  test('manual merge | root-level title', () => {
    expect(mergeDocs(docPt, docEn, ['title'])).toStrictEqual({
      ...docPt,
      title: docEn.title,
    })
  })

  test('manual merge | root-level array (body)', () => {
    expect(mergeDocs(docPt, docEn, ['body'])).toStrictEqual({
      ...docPt,
      body: docEn.body,
    })
  })

  test('manual merge | specific array elements', () => {
    for (const block of docPt.body) {
      expect(
        mergeDocs(docPt, docEn, ['body', { _key: block._key }]),
      ).toStrictEqual({
        ...docPt,
        body: (docPt.body as typeof docEn.body).map((b) => {
          if (b._key === block._key) {
            return docEn.body.find((enB) => enB._key === block._key)
          }
          return b
        }),
      })
    }
  })

  exampleDocuments.forEach(({ filename, document }) => {
    if (filename === 'simple-pt.json') {
      const changedBlockIdx = 0
      const changedBlock = {
        _key: document.body[changedBlockIdx]._key,
        _type: 'block',
        children: [
          {
            _key: '680b067c1713',
            _type: 'span',
            marks: [],
            text: 'Updated block!',
          },
        ],
        markDefs: [],
        style: 'normal',
      }

      const manuallyMerged = {
        ...document,
        body: [
          ...document.body.map((block, idx) => {
            if (idx === changedBlockIdx) {
              return changedBlock
            }
            return block
          }),
        ],
      }
      test(`${filename} | specific block`, () => {
        expect(
          mergeDocs(
            document,
            {
              _id: '_id',
              _rev: '_rev',
              _type: '_type',
              _updatedAt: '_updatedAt',
              _createdAt: '_createdAt',
              body: [changedBlock],
            },
            ['body', { _key: document.body[changedBlockIdx]._key }],
          ),
        ).toStrictEqual(manuallyMerged)
      })
    }
  })
})
