// Adapted from: https://github.com/sanity-io/sanity/blob/main/packages/sanity/src/core/form/inputs/ReferenceInput/utils/TimeAgo.tsx

import { useTimeAgo } from 'sanity'

export function TimeAgo({ time }: { time: string }) {
  const timeSince = useTimeAgo(time)

  return <span title={timeSince}>{timeSince} ago</span>
}
