import { MutationError } from '@sanity/client'

/** Parses errors returned by Sanity client and returns if mutation */
export default function getMutationErrors(error: unknown) {
  if (
    typeof error !== 'object' ||
    !error ||
    !('details' in error) ||
    typeof error.details !== 'object' ||
    !error.details ||
    !('type' in error.details) ||
    error.details.type !== 'mutationError'
  ) {
    return null
  }

  return error.details as MutationError['error']
}
