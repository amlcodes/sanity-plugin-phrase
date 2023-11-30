import { MutationError } from '@sanity/client'
import { Duration, Schedule, pipe } from 'effect'

export const retrySchedule = pipe(
  // Exponential backoff with 100ms initial delay and 4x growth factor
  Schedule.exponential(Duration.millis(100), 4),
  // At most 1 second between retries
  Schedule.either(Schedule.spaced(Duration.seconds(1.5))),
  // And use it to stop retrying after a total of 10 seconds have elapsed
  Schedule.upTo('10 seconds'),
)

export function createResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
} /** Parses errors returned by Sanity client and returns if mutation */

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
