import { testSanityClient } from './testSanityClient'

async function unlockForTesting() {
  const ids = await testSanityClient.fetch<string[]>(
    `*[defined(phraseMeta)]._id`,
  )
  const transaction = testSanityClient.transaction()

  for (const id of ids) {
    transaction.patch(id, (patch) => patch.unset(['phraseMeta']))
  }

  if (process.argv.includes('--remove-ptds')) {
    const ptdIds = await testSanityClient.fetch<string[]>(
      `*[phraseMeta._type == "phrase.ptd.meta" || _id match "**phrase-translation--**"]._id`,
    )

    for (const id of ptdIds) {
      transaction.delete(id)
    }
  }

  if (process.argv.includes('--remove-translated')) {
    const translatedIds = await testSanityClient.fetch<string[]>(
      `*[_type == 'post' && language != 'en']._id`,
    )

    for (const id of translatedIds) {
      transaction.delete(id)
    }
  }

  await transaction.commit()
}

unlockForTesting()
