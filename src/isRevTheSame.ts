import { ContextWithFreshDocuments } from './types'

export class RevMismatchError {
  readonly _tag = 'RevMismatchError'
  constructor(
    readonly requestRev: string,
    readonly freshRev: string | undefined,
  ) {}
}

export default function isRevTheSame({
  request: { sourceDoc },
  freshSourceDoc,
}: ContextWithFreshDocuments) {
  if (sourceDoc._rev !== freshSourceDoc._rev) {
    return new RevMismatchError(sourceDoc._rev, freshSourceDoc._rev)
  }

  return true
}
