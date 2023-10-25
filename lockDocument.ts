import { Path } from '@sanity/types'
import { sanityClient } from './sanityClient'

export default async function lockDocument({
  pathKey,
  translationName,
  path,
  docIds,
}: {
  pathKey: string
  translationName: string
  path: Path
  /** Which ID variations of this document are in Sanity (draft & published) */
  docIds: string[]
}) {
  const transaction = sanityClient.transaction()
  for (const id of docIds) {
    transaction.patch(id, (patch) => {
      return patch
        .setIfMissing({ phraseTranslations: [] })
        .insert('replace', `phraseTranslations[${pathKey}]`, [
          {
            _type: 'phrase.mainMetadata',
            _key: pathKey,
            projectName: translationName,
            path,
            status: 'CREATING',
          },
        ])
    })
  }
  await transaction.commit()
}
