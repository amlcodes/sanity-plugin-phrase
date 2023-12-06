import { describe, expect, test } from 'bun:test'
// import { describe, expect, test } from 'vitest'
import { mergeDocs } from '../src/mergeDocs'
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
  arrayNotInPt: [
    { _key: 'block-0', title: 'Array item in EN - #0' },
    { _key: 'block-1', title: 'Array item in EN - #1' },
    { _key: 'block-2', title: 'Array item in EN - #2' },
    { _key: 'block-3', title: 'Array item in EN - #3' },
  ],
  body: [
    {
      _key: 'block-0',
      _type: 'block',
      children: [
        {
          _key: '680b067c1713',
          _type: 'span',
          marks: [],
          text: 'EN block #0',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
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
    {
      _key: 'block-4',
      _type: 'block',
      children: [
        {
          _key: 'c2f7d17ad0a4',
          _type: 'span',
          marks: [],
          text: 'EN block #4',
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
      _key: 'block-3',
      _type: 'block',
      children: [
        {
          _key: 'c2f7d17ad0a4',
          _type: 'span',
          marks: [],
          text: 'PT block #3',
        },
      ],
      markDefs: [],
      style: 'normal',
    },
  ],
}

describe('Document merging', () => {
  test('manual merge | entire document', () => {
    expect(
      mergeDocs({ originalDoc: docPt, changedDoc: docEn, paths: [] }),
    ).toStrictEqual({
      ...docEn,
      _id: docPt._id,
      _rev: docPt._rev,
      _type: docPt._type,
    })
  })

  test('manual merge | root-level title', () => {
    expect(
      mergeDocs({ originalDoc: docPt, changedDoc: docEn, paths: [['title']] }),
    ).toStrictEqual({
      ...docPt,
      title: docEn.title,
    })
  })

  test('manual merge | root-level array (body)', () => {
    expect(
      mergeDocs({ originalDoc: docPt, changedDoc: docEn, paths: [['body']] }),
    ).toStrictEqual({
      ...docPt,
      body: docEn.body,
    })
  })

  test('manual merge | new element in array (at the start, body[block-0])', () => {
    expect(
      mergeDocs({
        originalDoc: docPt,
        changedDoc: docEn,
        paths: [['body', { _key: 'block-0' }]],
      }),
    ).toStrictEqual({
      ...docPt,
      body: [docEn.body.find((b) => b._key === 'block-0'), ...docPt.body],
    })
  })

  test('manual merge | new element in array (at the middle, body[block-2])', () => {
    expect(
      mergeDocs({
        originalDoc: docPt,
        changedDoc: docEn,
        paths: [['body', { _key: 'block-2' }]],
      }),
    ).toStrictEqual({
      ...docPt,
      body: [
        ...docPt.body.slice(0, 2),
        docEn.body.find((b) => b._key === 'block-2'),
        ...docPt.body.slice(2),
      ],
    })
  })

  test('manual merge | new element in array (at the end, body[block-4])', () => {
    expect(
      mergeDocs({
        originalDoc: docPt,
        changedDoc: docEn,
        paths: [['body', { _key: 'block-4' }]],
      }),
    ).toStrictEqual({
      ...docPt,
      body: [...docPt.body, docEn.body.find((b) => b._key === 'block-4')],
    })
  })

  test('manual merge | specific array elements', () => {
    for (const block of docPt.body) {
      expect(
        mergeDocs({
          originalDoc: docPt,
          changedDoc: docEn,
          paths: [['body', { _key: block._key }]],
        }),
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

  test('manual merge | new element in missing array', () => {
    expect(
      mergeDocs({
        originalDoc: docPt,
        changedDoc: docEn,
        paths: [['arrayNotInPt', { _key: 'block-0' }]],
      }),
    ).toStrictEqual({
      ...docPt,
      arrayNotInPt: [docEn.arrayNotInPt.find((b) => b._key === 'block-0')],
    })
  })

  test('manual merge | new root-level field (slug)', () => {
    expect(
      mergeDocs({ originalDoc: docPt, changedDoc: docEn, paths: [['slug']] }),
    ).toStrictEqual({
      ...docPt,
      slug: docEn.slug,
    })
  })

  test('manual merge | root-level title, array (body) and new root-level field (slug)', () => {
    expect(
      mergeDocs({
        originalDoc: docPt,
        changedDoc: docEn,
        paths: [['title'], ['body'], ['slug']],
      }),
    ).toStrictEqual({
      ...docPt,
      title: docEn.title,
      body: docEn.body,
      slug: docEn.slug,
    })
  })

  test('manual merge | nested field in missing root-level field (slug.current)', () => {
    expect(
      mergeDocs({
        originalDoc: docPt,
        changedDoc: docEn,
        paths: [['slug', 'current']],
      }),
    ).toStrictEqual({
      ...docPt,
      slug: docEn.slug,
    })
  })

  exampleDocuments.forEach(({ filename, document: currentDocument }) => {
    if (filename === 'simple-pt.json') {
      const changedBlockIdx = 0
      const changedBlock = {
        _key: currentDocument.body[changedBlockIdx]._key,
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
        ...currentDocument,
        body: [
          ...(currentDocument.body as any[]).map((block, idx) => {
            if (idx === changedBlockIdx) {
              return changedBlock
            }
            return block
          }),
        ],
      }
      test(`auto merge (${filename}) | specific block`, () => {
        expect(
          mergeDocs({
            originalDoc: currentDocument,
            changedDoc: {
              _id: '_id',
              _rev: '_rev',
              _type: '_type',
              _updatedAt: '_updatedAt',
              _createdAt: '_createdAt',
              body: [changedBlock],
            },
            paths: [
              ['body', { _key: currentDocument.body[changedBlockIdx]._key }],
            ],
          }),
        ).toStrictEqual(manuallyMerged)
      })
    }
  })
})
