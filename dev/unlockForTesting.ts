import { sanityClient } from '../src/sanityClient'

async function unlockForTesting() {
  const ids = await sanityClient.fetch<string[]>(`*[defined(phraseMeta)]._id`)
  const transaction = sanityClient.transaction()

  for (const id of ids) {
    transaction.patch(id, (patch) => patch.unset(['phraseMeta']))
  }

  if (process.argv.includes('--remove-ptds')) {
    const ptdIds = await sanityClient.fetch<string[]>(
      `*[phraseMeta._type == "phrase.ptd.meta" || _id match "**phrase-translation--**"]._id`,
    )

    for (const id of ptdIds) {
      transaction.delete(id)
    }
  }

  if (process.argv.includes('--remove-translated')) {
    const translatedIds = await sanityClient.fetch<string[]>(
      `*[_type == 'post' && language != 'en']._id`,
    )

    for (const id of translatedIds) {
      transaction.delete(id)
    }
  }

  await transaction.commit()
}

unlockForTesting()
