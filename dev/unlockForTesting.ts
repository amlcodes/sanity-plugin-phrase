import { METADATA_KEY } from '../src/types'
import { testSanityClient } from './testSanityClient'

async function unlockForTesting() {
  const ids = await testSanityClient.fetch<string[]>(
    `*[defined(${METADATA_KEY})]._id`,
  )
  const unsetMetaTx = testSanityClient.transaction()

  for (const id of ids) {
    unsetMetaTx.patch(id, (patch) => patch.unset([METADATA_KEY]))
  }

  const deleteDocsTx = testSanityClient.transaction()
  if (process.argv.includes('--remove-ptds')) {
    const ptdIds = await testSanityClient.fetch<string[]>(
      `*[${METADATA_KEY}._type == "phrase.ptd.meta" || _id match "**phrase-translation--**" || _type == 'phrase.tmd']._id`,
    )

    for (const id of ptdIds) {
      deleteDocsTx.delete(id)
    }
  }

  if (process.argv.includes('--remove-translated')) {
    const translatedIds = await testSanityClient.fetch<string[]>(
      `*[_type == 'post' && language != 'en']._id`,
    )

    for (const id of translatedIds) {
      deleteDocsTx.delete(id)
    }
  }

  await unsetMetaTx.commit()
  await deleteDocsTx.commit()
}

unlockForTesting()
