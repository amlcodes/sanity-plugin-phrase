import { METADATA_KEY } from '../src/types'
import { testSanityClient } from './testSanityClient'

async function unlockForTesting() {
  const ids = await testSanityClient.fetch<string[]>(
    `*[defined(${METADATA_KEY})]._id`,
  )
  const transaction = testSanityClient.transaction()

  for (const id of ids) {
    transaction.patch(id, (patch) => patch.unset([METADATA_KEY]))
  }

  if (process.argv.includes('--remove-ptds')) {
    const ptdIds = await testSanityClient.fetch<string[]>(
      `*[${METADATA_KEY}._type == "phrase.ptd.meta" || _id match "**phrase-translation--**" || _type == 'phrase.tmd']._id`,
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
