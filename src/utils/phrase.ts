import { DocumentStore, Path, createHookFromObservableFactory } from 'sanity'
import {
  PhraseDatacenterRegion,
  getPhraseBaseUrl,
} from '../clients/createPhraseClient'
import { PtdPhraseMetadata } from '~/types'

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
    /* groq */ `*[_id == $id][0].phraseMetadata`,
    { id: props.ptdId },
    {
      apiVersion: '2023-05-22',
      throttleTime: 3500,
      perspective: 'previewDrafts',
    },
  )
})
