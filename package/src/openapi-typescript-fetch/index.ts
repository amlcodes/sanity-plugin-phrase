// Credits: ajaishankar
// https://github.com/ajaishankar/openapi-typescript-fetch/

// This is a small fix to ensure we can send binary files through the fetcher - needed for `phraseClient.jobs.create`

import { Fetcher } from './fetcher'
import { arrayRequestBody } from './utils'

import type {
  ApiResponse,
  FetchArgType,
  FetchReturnType,
  FetchErrorType,
  Middleware,
  OpArgType,
  OpErrorType,
  OpDefaultReturnType,
  OpReturnType,
  TypedFetch,
} from './types'

import { ApiError } from './types'

export type {
  OpArgType,
  OpErrorType,
  OpDefaultReturnType,
  OpReturnType,
  FetchArgType,
  FetchReturnType,
  FetchErrorType,
  ApiResponse,
  Middleware,
  TypedFetch,
}

export { Fetcher, ApiError, arrayRequestBody }
