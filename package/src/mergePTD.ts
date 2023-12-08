import { SanityClient } from 'sanity'
import { mergeDocs } from './mergeDocs'
import { SanityDocumentWithPhraseMetadata, SanityPTD, SanityTMD } from './types'
import { draftId, isPTDDoc, undraftId } from './utils'
import { diffPatch } from 'sanity-diff-patch'
import { Transaction } from '@sanity/client'

export function getMergePTDTransaction({
  PTD,
  targetDocs,
  TMD,
  initialTx: transaction,
}: {
  PTD: SanityPTD
  TMD: SanityTMD
  targetDocs: SanityDocumentWithPhraseMetadata[]
  initialTx: Transaction
}) {
  targetDocs.forEach((freshTargetDoc) => {
    const newTargetDoc = {
      ...mergeDocs({
        startingDocument: freshTargetDoc,
        updatedDocument: PTD,
        diffs: TMD.diffs,
      }),
      phraseMetadata: freshTargetDoc.phraseMetadata,
    }
    const patches = diffPatch(freshTargetDoc, newTargetDoc, {
      // Prevent modifying target doc if its _rev has changed since the function started running
      ifRevisionID: true,
    })
    for (const { patch } of patches) {
      transaction.patch(patch.id, patch)
    }
  })

  return transaction
}

/**
 * Assumes PTD has been already refreshed with Phrase data and is ready to be merged.
 */
export default async function mergePTD({
  sanityClient,
  PTD,
}: {
  sanityClient: SanityClient
  PTD: SanityPTD
}) {
  if (!isPTDDoc(PTD)) {
    return { error: 'Not a valid PTD' }
  }

  const {
    targetDoc: { _ref: targetRef },
  } = PTD.phraseMetadata

  const { targetDocs, TMD } = await sanityClient.fetch<{
    targetDocs: SanityDocumentWithPhraseMetadata[]
    TMD: SanityTMD
  }>(
    `{
      "targetDocs": *[_id in $targetIds],
      "TMD": *[_id == $TMDRef][0]
    }`,
    {
      targetIds: [undraftId(targetRef), draftId(targetRef)],
      TMDRef: PTD.phraseMetadata.tmd._ref,
    },
  )
  const transaction = getMergePTDTransaction({
    PTD,
    TMD,
    targetDocs,
    initialTx: sanityClient.transaction(),
  })

  try {
    await transaction.commit({ returnDocuments: false })
    return {
      success: true,
      modifiedDocs: targetDocs.map((d) => d._id),
    }
  } catch (error) {
    return {
      error,
    }
  }
}
