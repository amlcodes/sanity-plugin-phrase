import { Path, SanityDocument } from '@sanity/types'
import { sanityClient } from './sanityClient'
import { numEqualSegments } from '@sanity/util/paths'

// @TODO: implementation
function undraftId(id: string) {
  return id.replace('drafts.', '')
}

export default async function ensureDocNotLocked(
  sanityDocument: SanityDocument,
  path: Path,
) {
  const translatedPathsAlreadyInSanity = await sanityClient.fetch<
    {
      _id: string
      paths: Path
    }[]
  >(
    `*[_id match ("**." + $id)]{
      _id,
      "paths": phraseTranslations[].path
    }`,
    {
      id: undraftId(sanityDocument._id),
    },
  )

  if (
    translatedPathsAlreadyInSanity.some(
      (d) => numEqualSegments(d.paths, path) > 0,
    )
  ) {
    throw new Error('Translation already pending for this path')
  }

  return {
    locked: false,
    docIds: translatedPathsAlreadyInSanity.map((d) => d._id),
  }
}
