import { DocumentStore, Path, createHookFromObservableFactory } from 'sanity'
import {
  PhraseDatacenterRegion,
  getPhraseBaseUrl,
} from '../clients/createPhraseClient'
import {
  CommittedMainDocMetadata,
  CreatedMainDocMetadata,
  CrossSystemLangCode,
  METADATA_KEY,
  MainDocTranslationMetadata,
  Phrase,
  PhraseJobInfo,
  PtdPhraseMetadata,
  SanityDocumentWithPhraseMetadata,
  SanityMainDoc,
  SanityPTD,
  SanityTMD,
} from '../types'
import { FILENAME_PREFIX } from './constants'
import { isPtdId } from './ids'
import { langsAreTheSame } from './langs'

export function jobsMetadataExtractor(jobs: PhraseJobInfo[]) {
  const lastJob = jobs[jobs.length - 1]
  const furthestOngoingJob = jobs.find((job) => jobIsOngoing(job)) || lastJob

  return {
    stepName: furthestOngoingJob?.workflowStep?.name || 'Ongoing',
    stepStatus: furthestOngoingJob?.status || 'NEW',
    due: lastJob?.dateDue,
    activeJobUid: furthestOngoingJob?.uid,
  }
}

export function getProjectURL(
  projectUid: string,
  region: PhraseDatacenterRegion,
) {
  return `${getPhraseBaseUrl(region)}/project2/show/${projectUid}`
}

export function getJobEditorURL(
  jobUid: string,
  region: PhraseDatacenterRegion,
) {
  return `${getPhraseBaseUrl(region)}/job/${jobUid}/translate/`
}

export function getPathsLabel(paths: Path[]) {
  return paths
    .map((p) => (p.length ? `[${p.join(', ')}]` : "Entire document's content"))
    .join(', ')
}

export const usePtdState = createHookFromObservableFactory<
  PtdPhraseMetadata,
  {
    documentStore: DocumentStore
    /** published version */
    ptdId: SanityPTD['_id']
  }
>((props) => {
  return props.documentStore.listenQuery(
    /* groq */ `*[_id == $id][0].${METADATA_KEY}`,
    { id: props.ptdId },
    {
      apiVersion: '2023-05-22',
      throttleTime: 3500,
      perspective: 'previewDrafts',
    },
  )
})

const cancelledStatuses: PhraseJobInfo['status'][] = [
  'CANCELLED',
  'DECLINED',
  'REJECTED',
]

export function jobIsCancelled(job: Pick<PhraseJobInfo, 'status'>) {
  return cancelledStatuses.includes(job.status)
}

export function jobIsComplete(job: Pick<PhraseJobInfo, 'status'>) {
  return job.status === 'COMPLETED' || job.status === 'COMPLETED_BY_LINGUIST'
}

function jobIsOngoing(job: Pick<PhraseJobInfo, 'status'>) {
  return !jobIsCancelled(job) && !jobIsComplete(job)
}

export function getLastValidJobInWorkflow(jobs: PhraseJobInfo[]) {
  return sortJobsByWorkflowLevel(jobs).filter((j) => !jobIsCancelled(j))[0] as
    | PhraseJobInfo
    | undefined
}

/** Later steps come first */
function sortJobsByWorkflowLevel(jobs: PhraseJobInfo[]) {
  return jobs.sort((a, b) => {
    if (typeof a.workflowLevel !== 'number') return 1
    if (typeof b.workflowLevel !== 'number') return -1

    return b.workflowLevel - a.workflowLevel
  })
}

export function isPTDDoc(
  doc: SanityDocumentWithPhraseMetadata,
): doc is SanityPTD {
  return isPtdId(doc._id) && doc.phraseMetadata?._type === 'phrase.ptd.meta'
}

export function isMainDoc(
  doc: SanityDocumentWithPhraseMetadata,
): doc is SanityMainDoc {
  return doc.phraseMetadata?._type === 'phrase.main.meta'
}

/** Only returns if has at least one translation */
export function isTranslatedMainDoc(
  doc: SanityDocumentWithPhraseMetadata,
): doc is SanityMainDoc {
  return (
    isMainDoc(doc) &&
    Array.isArray(doc.phraseMetadata.translations) &&
    doc.phraseMetadata.translations.length > 0
  )
}

export function isMainDocAndTranslatedForLang(
  doc: SanityDocumentWithPhraseMetadata,
  lang: CrossSystemLangCode,
): doc is SanityMainDoc {
  return (
    isTranslatedMainDoc(doc) &&
    doc.phraseMetadata.translations.some(
      (t) =>
        'targetLangs' in t &&
        t.targetLangs.some((tl) => langsAreTheSame(tl, lang)),
    )
  )
}

export function hasTranslationsUnfinished(doc: SanityMainDoc) {
  return doc.phraseMetadata.translations.some((t) => !isTranslationCommitted(t))
}

/**
 * All `targetLangs` are ongoing.
 */
export function allTranslationsUnfinished(
  doc: SanityMainDoc,
  targetLangs: CrossSystemLangCode[],
) {
  return (
    hasTranslationsUnfinished(doc) &&
    targetLangs.every((l) =>
      doc.phraseMetadata.translations.some(
        (t) =>
          !isTranslationCommitted(t) &&
          'targetLangs' in t &&
          t.targetLangs.some((tl) => langsAreTheSame(l, tl)),
      ),
    )
  )
}

export function isTranslationCommitted(
  translation: MainDocTranslationMetadata,
): translation is CommittedMainDocMetadata {
  return translation.status === 'COMMITTED'
}

export function isTranslationReadyToCommit(
  translation: MainDocTranslationMetadata,
): translation is CreatedMainDocMetadata {
  return translation.status === 'COMPLETED'
}

export function phraseDatetimeToJSDate<D extends string | undefined>(
  phraseDate?: D,
) {
  if (!phraseDate) return undefined as D extends undefined ? undefined : Date

  try {
    return new Date(phraseDate) as D extends undefined ? undefined : Date
  } catch (error) {
    return new Date(phraseDate.split('+')[0]) as D extends undefined
      ? undefined
      : Date
  }
}

export function comesFromSanity(
  entity:
    | Pick<Phrase['JobPart'], 'filename'>
    | Pick<Phrase['JobInWebhook'], 'fileName'>
    | Pick<Phrase['CreatedProject'], 'name'>,
) {
  const name = (() => {
    if ('filename' in entity) return entity.filename

    if ('fileName' in entity) return entity.fileName

    if ('name' in entity) return entity.name

    return undefined
  })()

  return name && name.startsWith(FILENAME_PREFIX)
}

export function getTranslationSnapshot(doc: SanityDocumentWithPhraseMetadata) {
  return JSON.stringify({
    ...doc,
    [METADATA_KEY]: undefined,
  }) as SanityTMD['sourceSnapshot']
}

export function parseTranslationSnapshot(
  doc: SanityTMD['sourceSnapshot'] | SanityDocumentWithPhraseMetadata,
) {
  if (typeof doc === 'object') return doc

  try {
    return JSON.parse(doc) as SanityDocumentWithPhraseMetadata
  } catch (error) {
    return undefined
  }
}
