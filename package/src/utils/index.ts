export * from './arrays'
export * from './constants'
export * from './dates'
export * from './ids'
export * from './labels'
export * from './langs'
export * from './paths'
export * from './phrase'
export * from './strings'

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
