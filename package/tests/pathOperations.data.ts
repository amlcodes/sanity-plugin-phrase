import { SanityDocument } from 'sanity'

const SAMPLE_ARRAY_OF_PRIMITIVES = ['string #1', 'string #2', 'string #3']
const VALUES = {
  added: 'This key was added',
  changed: 'The changed value',
  original: 'The original value',
  removed: 'This key was removed',
}

const testValueTypes = {
  testNullProperty: null,
  testUndefinedProperty: undefined,
  test0Property: 0,
  testNumberProperty: 10,
  testStringProperty: 'string',
  testEmptyStringProperty: '',
  testFalseProperty: false,
  testTrueProperty: false,
  testEmptyObjectProperty: {},
  testArrayProperty: SAMPLE_ARRAY_OF_PRIMITIVES,
  testEmptyArrayProperty: [],
}

const shared: SanityDocument = {
  _id: 'post_id',
  _rev: 'rev',
  _type: 'post',
  _createdAt: '',
  _updatedAt: '',
  ...testValueTypes,
}

export const exampleHistoricVersion = {
  ...shared,
  changedKey: VALUES.original,
  removedKey: VALUES.removed,
  arrayOfPrimitivesChanged: SAMPLE_ARRAY_OF_PRIMITIVES,
  arrayOfPrimitivesRemoved: SAMPLE_ARRAY_OF_PRIMITIVES,
  arrayOfPrimitivesAdded: SAMPLE_ARRAY_OF_PRIMITIVES,
  arrayOfPrimitivesIntact: SAMPLE_ARRAY_OF_PRIMITIVES,
  array: [
    {
      _key: 'removed-block',
      value: 'This block was removed',
      ...testValueTypes,
    },
    {
      _key: 'changed-block',
      value: 'The original block',
      ...testValueTypes,
    },
    {
      _key: 'intact-block-root',
      value: 'The original block',
      ...testValueTypes,
      objectInArray: {
        ...testValueTypes,
        changedKey: VALUES.original,
        removedKey: VALUES.removed,
      },
    },
  ],
  object: {
    ...testValueTypes,
    changedKey: VALUES.original,
    removedKey: VALUES.removed,
    subObject: {
      ...testValueTypes,
      changedKey: VALUES.original,
      removedKey: VALUES.removed,
    },
  },
}

export const exampleCurrentVersion = {
  ...shared,
  changedKey: VALUES.changed,
  addedKey: VALUES.added,
  arrayOfPrimitivesChanged: SAMPLE_ARRAY_OF_PRIMITIVES.map(
    (item) => `${item} (changed)`,
  ),
  arrayOfPrimitivesRemoved: SAMPLE_ARRAY_OF_PRIMITIVES.slice(1),
  arrayOfPrimitivesAdded: [...SAMPLE_ARRAY_OF_PRIMITIVES, 'new item'],
  arrayOfPrimitivesIntact: SAMPLE_ARRAY_OF_PRIMITIVES,
  array: [
    {
      ...testValueTypes,
      _key: 'new-block-idx-0',
      value: 'New block at index #0',
    },
    {
      ...testValueTypes,
      _key: 'changed-block',
      value: 'The changed block value',
    },
    {
      ...testValueTypes,
      _key: 'new-block-idx-2',
      value: 'New block at index #2',
    },
    {
      ...testValueTypes,
      _key: 'intact-block-root',
      value: 'The original block',
      objectInArray: {
        ...testValueTypes,
        changedKey: VALUES.changed,
        addedKey: VALUES.added,
      },
    },
  ],
  object: {
    ...testValueTypes,
    changedKey: VALUES.changed,
    addedKey: VALUES.added,
    subObject: {
      ...testValueTypes,
      changedKey: VALUES.changed,
      addedKey: VALUES.added,
    },
  },
}

export const exampleHistoricVersionInserted = {
  ...exampleHistoricVersion,
  addedKey: exampleCurrentVersion.addedKey,
  array: [
    {
      _key: 'removed-block',
      value: 'This block was removed',
      ...testValueTypes,
    },
    {
      ...testValueTypes,
      _key: 'new-block-idx-0',
      value: 'New block at index #0',
    },
    {
      _key: 'changed-block',
      value: 'The original block',
      ...testValueTypes,
    },
    {
      ...testValueTypes,
      _key: 'new-block-idx-2',
      value: 'New block at index #2',
    },
    {
      _key: 'intact-block-root',
      value: 'The original block',
      ...testValueTypes,
      objectInArray: {
        ...testValueTypes,
        changedKey: VALUES.changed,
        addedKey: VALUES.added,
        removedKey: VALUES.removed,
      },
    },
  ],
  object: {
    ...exampleHistoricVersion.object,
    addedKey: exampleCurrentVersion.object.addedKey,
    subObject: {
      ...exampleHistoricVersion.object.subObject,
      addedKey: exampleCurrentVersion.object.subObject.addedKey,
    },
  },
}

export const exampleHistoricVersionUnsetted = {
  ...shared,
  changedKey: VALUES.original,
  arrayOfPrimitivesChanged: SAMPLE_ARRAY_OF_PRIMITIVES,
  arrayOfPrimitivesRemoved: SAMPLE_ARRAY_OF_PRIMITIVES,
  arrayOfPrimitivesAdded: SAMPLE_ARRAY_OF_PRIMITIVES,
  arrayOfPrimitivesIntact: SAMPLE_ARRAY_OF_PRIMITIVES,
  array: [
    {
      ...testValueTypes,
      _key: 'changed-block',
      value: 'The original block',
    },
    {
      ...testValueTypes,
      _key: 'intact-block-root',
      value: 'The original block',
      objectInArray: {
        ...testValueTypes,
        changedKey: VALUES.original,
      },
    },
  ],
  object: {
    ...testValueTypes,
    changedKey: VALUES.original,
    subObject: {
      ...testValueTypes,
      changedKey: VALUES.original,
    },
  },
}

export const exampleHistoricVersionArrayOfPrimitives = {
  ...exampleHistoricVersion,
  arrayOfPrimitivesChanged: exampleCurrentVersion.arrayOfPrimitivesChanged,
  arrayOfPrimitivesRemoved: exampleCurrentVersion.arrayOfPrimitivesRemoved,
  arrayOfPrimitivesAdded: exampleCurrentVersion.arrayOfPrimitivesAdded,
  arrayOfPrimitivesIntact: exampleHistoricVersion.arrayOfPrimitivesIntact,
}
