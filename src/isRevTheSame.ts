import { SanityTranslationDocPair, TranslationRequest } from './types'
import { isDraft } from './utils'

export class RevMismatchError {
  readonly _tag = 'RevMismatchError'
  constructor(
    readonly requestRev: string,
    readonly freshRev: string | undefined,
  ) {}
}

export default function isRevTheSame({
  sourceDoc,
  freshDocuments,
}: Pick<TranslationRequest, 'sourceDoc'> & {
  freshDocuments: SanityTranslationDocPair[]
}) {
  const sourceDocPair = freshDocuments.find(
    (d) => d.lang.sanity === sourceDoc.lang.sanity,
  ) as SanityTranslationDocPair

  const requestRev = sourceDoc._rev
  const freshDoc = isDraft(sourceDoc._id)
    ? sourceDocPair?.draft
    : sourceDocPair?.published
  const freshRev = freshDoc?._rev

  if (requestRev !== freshRev) {
    return new RevMismatchError(requestRev, freshRev)
  }

  return true
}
