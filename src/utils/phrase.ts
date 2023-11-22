import { DocumentStore, Path, createHookFromObservableFactory } from 'sanity'
import {
  METADATA_KEY,
  PhraseJobInfo,
  PtdPhraseMetadata,
  SanityDocumentWithPhraseMetadata,
  SanityPTD,
} from '~/types'
import {
  PhraseDatacenterRegion,
  getPhraseBaseUrl,
} from '../clients/createPhraseClient'

export function ptdMetadataExtractor(metadata: PtdPhraseMetadata) {
  const { jobs } = metadata
  const lastJob = jobs[jobs.length - 1]
  const furthestOngoingJob =
    jobs.find(
      (job) =>
        job.status !== 'COMPLETED' &&
        job.status !== 'CANCELLED' &&
        job.status !== 'REJECTED',
    ) || lastJob

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
    ptdId: string
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

export function docIsPTD(
  doc: SanityDocumentWithPhraseMetadata,
): doc is SanityPTD {
  return (
    doc.phraseMetadata?._type === 'phrase.ptd.meta' &&
    doc.phraseMetadata.jobs &&
    doc.phraseMetadata.jobs.length > 0
  )
}
