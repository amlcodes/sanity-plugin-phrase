import { sanityClient } from './sanityClient'

async function unlockForTesting() {
  const ids = await sanityClient.fetch<string[]>(
    `*[defined(phraseTranslations)]._id`,
  )
  const transaction = sanityClient.transaction()

  for (const id of ids) {
    transaction.patch(id, (patch) => patch.unset(['phraseTranslations']))
  }

  await transaction.commit()
}

unlockForTesting()
