import { Reference, SanityDocument } from '@sanity/types'
import pMap from 'p-map'
import { SanityClient, collate } from 'sanity'
import { parseAllReferences } from './parseAllReferences'
import { SanityDocumentWithPhraseMetadata } from './types'
import { draftId, isDraft, undraftId } from './utils'

/**
 * @TODO How can we improve this? We're currently over-fecthing from Sanity.
 * One possible improvement is skipping published docs if drafts are present.
 */
export default async function getAllDocReferences(
  sanityClient: SanityClient,
  document: SanityDocumentWithPhraseMetadata,
  maxDepth: number = 3,
) {
  let state = {
    referenced: {
      [document._id]: {
        doc: document,
        references: [],
        occurrences: [],
        maxDepth: 0,
      },
    } as {
      [docId: string]: {
        doc: SanityDocumentWithPhraseMetadata
        references: string[]
        occurrences: { depth: number; ref: Reference }[]
        maxDepth: number
      }
    },
    errors: {} as { [docId: string]: unknown },
  }

  function addRefOccurrence(ref: Reference, depth: number) {
    if (state.referenced[ref._ref]) {
      state.referenced[ref._ref].occurrences.push({ ref, depth })
      state.referenced[ref._ref].maxDepth = Math.max(
        state.referenced[ref._ref].maxDepth,
        depth,
      )
    }
  }

  function addDocReferences(
    doc: SanityDocumentWithPhraseMetadata,
    references: Reference[],
    depth: number,
  ) {
    if (!state.referenced[doc._id]) {
      state.referenced[doc._id] = {
        doc,
        occurrences: [],
        references: [],
        maxDepth: depth,
      }
    }

    state.referenced[doc._id].references.push(
      ...references.map((ref) => ref._ref),
    )
  }

  function persistError(
    doc: SanityDocumentWithPhraseMetadata,
    error: (typeof state)['errors'][string],
  ) {
    state.errors[doc._id] = error
  }

  async function fetchDocReferences(
    doc: SanityDocumentWithPhraseMetadata,
    currentDepth: number,
  ) {
    const docReferences = parseAllReferences(doc, [])

    addDocReferences(doc, docReferences, currentDepth)
    docReferences.forEach((ref) => addRefOccurrence(ref, currentDepth))

    if (currentDepth >= maxDepth) {
      return
    }

    const toFetch = docReferences.reduce((refs, ref) => {
      if (state.referenced[ref._ref]) {
        return refs
      }

      return {
        ...refs,
        [ref._ref]: [...(refs[ref._ref] || []), ref],
      }
    }, {} as Record<string, Reference[]>)

    console.log('QUERYING FROM SANITY', doc._id)
    const referencedDocuments = await sanityClient.fetch<SanityDocument[]>(
      `*[_id in $publishedIds || _id in $draftIds]`,
      {
        publishedIds: Object.keys(toFetch).map(undraftId),
        draftIds: Object.keys(toFetch).map(draftId),
      },
    )

    await pMap(
      referencedDocuments,
      async (doc: SanityDocument) => {
        try {
          // If we have a draft of the current published document, let that drive the references.
          // @TODO: is this valid? It leads to some missing published documents in the final data as compared to not having this check.
          // Come back to this once I'm ready to work with the references
          if (
            !isDraft(doc._id) &&
            referencedDocuments.find((a) => a._id === draftId(doc._id))
          ) {
            return
          }

          return await fetchDocReferences(doc, currentDepth + 1)
        } catch (error) {
          persistError(doc, error)
        }
      },
      {
        stopOnError: false,
        concurrency: 2,
      },
    )
  }

  await fetchDocReferences(document, 1)

  return collate(
    Object.values(state.referenced).map((a) => ({
      ...a.doc,
      __occurrences: a.occurrences,
      __references: a.references,
    })),
  )
}
