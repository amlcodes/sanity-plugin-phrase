import { SanityClient } from 'sanity'
import { SanityDocumentWithPhraseMetadata } from './types'

/**
 * Different history between published and draft.
 *
 * If returning an empty array, it could mean:
 * - (date) Document didn't exist back then
 * - (rev) Invalid _rev
 * - Document history missing - went beyond Sanity.io project's history retention limits
 * - (if draft ID) this draft didn't exist back then.
 *  - **Each draft is unique & has its own history.**
 *
 * @todo confirm: it seems like if invalid _rev, perhaps returns fake history?
 * @todo how do drafts behave?
 *
 * @docs https://www.sanity.io/docs/history-api
 */
export default async function getDocHistory(
  sanityClient: SanityClient,
  { docId, ...a }: { docId: string } & ({ rev: string } | { date: Date }),
) {
  const queryParams =
    'rev' in a ? `?revision=${a.rev}` : `?time=${a.date.toISOString()}`
  const { documents } = await sanityClient.request<{
    documents: SanityDocumentWithPhraseMetadata[]
  }>({
    uri: `/data/history/${
      sanityClient.config().dataset
    }/documents/${docId}${queryParams}`,
  })

  return documents
}
