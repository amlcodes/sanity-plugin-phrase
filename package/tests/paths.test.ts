import { describe, expect, test } from 'vitest'
// import { describe, expect, test } from 'bun:test'
import {
  getInsertedPaths,
  getUnsettedPaths,
  applyDiffs,
  getArrayOfPrimitivesResets,
} from '../src/utils'
import {
  exampleCurrentVersion,
  exampleHistoricVersion,
  exampleHistoricVersionArrayOfPrimitives,
  exampleHistoricVersionInserted,
  exampleHistoricVersionUnsetted,
} from './pathOperations.data'

describe('Path operations', () => {
  test('getUnsettedPaths', () =>
    expect(
      getUnsettedPaths({
        currentVersion: exampleCurrentVersion,
        historicVersion: exampleHistoricVersion,
      }),
    ).toStrictEqual([
      { path: ['removedKey'], op: 'unset' },
      {
        path: [
          'array',
          {
            _key: 'removed-block',
          },
        ],
        op: 'unset',
      },
      {
        path: [
          'array',
          {
            _key: 'intact-block-root',
          },
          'objectInArray',
          'removedKey',
        ],
        op: 'unset',
      },
      { path: ['object', 'removedKey'], op: 'unset' },
      { path: ['object', 'subObject', 'removedKey'], op: 'unset' },
    ]))
  test('getInsertedPaths', () =>
    expect(
      getInsertedPaths({
        currentVersion: exampleCurrentVersion,
        historicVersion: exampleHistoricVersion,
      }),
    ).toStrictEqual([
      { path: ['addedKey'], op: 'insert' },
      {
        path: ['array', { _key: 'new-block-idx-0' }],
        op: 'insert',
        insertAt: {
          index: 0,
          prevKey: undefined,
          nextKey: 'changed-block',
        },
      },
      {
        path: ['array', { _key: 'new-block-idx-2' }],
        op: 'insert',
        insertAt: {
          index: 2,
          prevKey: 'changed-block',
          nextKey: 'intact-block-root',
        },
      },
      {
        path: [
          'array',
          { _key: 'intact-block-root' },
          'objectInArray',
          'addedKey',
        ],
        op: 'insert',
      },
      { path: ['object', 'addedKey'], op: 'insert' },
      { path: ['object', 'subObject', 'addedKey'], op: 'insert' },
    ]))

  test('unsetPaths', () =>
    objectsMatch(
      applyDiffs({
        startingDocument: exampleHistoricVersion,
        updatedDocument: exampleCurrentVersion,
        diffs: getUnsettedPaths({
          currentVersion: exampleCurrentVersion,
          historicVersion: exampleHistoricVersion,
        }),
      }),
      exampleHistoricVersionUnsetted,
    ))

  test('insertPaths', () =>
    objectsMatch(
      applyDiffs({
        startingDocument: exampleHistoricVersion,
        updatedDocument: exampleCurrentVersion,
        diffs: getInsertedPaths({
          currentVersion: exampleCurrentVersion,
          historicVersion: exampleHistoricVersion,
        }),
      }),
      exampleHistoricVersionInserted,
    ))

  test('resetArraysOfPrimitives', () =>
    objectsMatch(
      applyDiffs({
        startingDocument: exampleHistoricVersion,
        updatedDocument: exampleCurrentVersion,
        diffs: getArrayOfPrimitivesResets({
          currentVersion: exampleCurrentVersion,
          historicVersion: exampleHistoricVersion,
        }),
      }),
      exampleHistoricVersionArrayOfPrimitives,
    ))
})

function objectsMatch(received, expected) {
  const sortedReceived = JSON.stringify(
    received,
    Object.keys(received).sort(),
    2,
  )
  const sortedExpected = JSON.stringify(
    expected,
    Object.keys(expected).sort(),
    2,
  )

  return expect(sortedReceived).toEqual(sortedExpected)
}
