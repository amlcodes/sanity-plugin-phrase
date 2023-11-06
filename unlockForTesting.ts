import { sanityClient } from './sanityClient'

async function unlockForTesting() {
  const ids = await sanityClient.fetch<string[]>(`*[defined(phraseMeta)]._id`)
  const transaction = sanityClient.transaction()

  for (const id of ids) {
    transaction.patch(id, (patch) => patch.unset(['phraseMeta']))
  }

  await transaction.commit()
}

unlockForTesting()
