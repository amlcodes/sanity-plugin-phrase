import { DocumentStore, createHookFromObservableFactory } from 'sanity'
import { SanityTMD } from '../types'
import { SANITY_API_VERSION, TMD_TYPE, draftId, undraftId } from '../utils'

export const useTMDs = createHookFromObservableFactory<
  // Pick<SanityMainDoc, '_id' | '_type' | '_rev' | 'phraseMetadata'>[],
  SanityTMD[],
  {
    documentStore: DocumentStore
    docId: string
  }
>(({ documentStore, docId }) => {
  return documentStore.listenQuery(
    /* groq */ `*[
      _type == "${TMD_TYPE}" &&
      references($ids)
    ]`,
    { ids: [undraftId(docId), draftId(docId)] },
    {
      apiVersion: SANITY_API_VERSION,
    },
  )
})
