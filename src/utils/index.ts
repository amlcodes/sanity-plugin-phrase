import { FILENAME_PREFIX } from './constants'
import { Phrase, TranslationRequest } from '../types'
import { getTranslationKey } from './ids'
export * from './ids'
export * from './paths'
export * from './constants'

// @TODO create friendlier names - requires schema
export function getTranslationName({ sourceDoc, paths }: TranslationRequest) {
  const name = `${FILENAME_PREFIX} ${sourceDoc._type} ${getTranslationKey(
    paths,
    sourceDoc._rev,
  )} ${sourceDoc._id}`
  return {
    name,
    filename: `${name}.json`,
  }
}

export function jobComesFromSanity(
  job:
    | Pick<Phrase['JobPart'], 'filename'>
    | Pick<Phrase['JobInWebhook'], 'fileName'>,
) {
  const name =
    'filename' in job
      ? job.filename
      : 'fileName' in job
      ? job.fileName
      : undefined
  return name && name.startsWith(FILENAME_PREFIX)
}

export function dedupeArray<T>(arr: T[]) {
  return Array.from(new Set(arr))
}
