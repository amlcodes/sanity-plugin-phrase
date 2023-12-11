'use client'

import { CopyIcon } from '@sanity/icons'
import { uuid } from '@sanity/uuid'
import { useCallback, useState } from 'react'
import {
  DocumentActionComponent,
  InsufficientPermissionsMessage,
  useClient,
  useCurrentUser,
  useDocumentOperation,
  useDocumentPairPermissions,
} from 'sanity'
import { useRouter } from 'sanity/router'
import { SANITY_API_VERSION, draftId } from '../utils'

const DISABLED_REASON_TITLE = {
  NOTHING_TO_DUPLICATE:
    'This document doesn’t yet exist so there‘s nothing to duplicate',
}

/**
 * Adaptation of Sanity's default DuplicateAction that removes the `phraseMetadata` property of documents before duplicating them.
 *
 * Original duplication action: https://github.com/sanity-io/sanity/blob/next/packages/sanity/src/desk/documentActions/DuplicateAction.tsx
 */
export const DuplicateTranslatedDocumentAction: DocumentActionComponent = ({
  id,
  type,
  onComplete,
  draft,
  published,
}) => {
  const doc = draft || published
  const client = useClient({ apiVersion: SANITY_API_VERSION })
  const { duplicate } = useDocumentOperation(id, type)
  const router = useRouter()
  const [isDuplicating, setDuplicating] = useState(false)
  const [permissions, isPermissionsLoading] = useDocumentPairPermissions({
    id,
    type,
    permission: 'duplicate',
  })

  const currentUser = useCurrentUser()

  const handle = useCallback(async () => {
    if (!doc) return

    const dupeId = draftId(uuid())

    setDuplicating(true)
    await client.create(
      {
        ...doc,
        _id: dupeId,
        _createdAt: undefined,
        _updatedAt: undefined,
        phraseMetadata: undefined,
      },
      { returnDocuments: false, tag: 'document.duplicate' },
    )
    router.navigateIntent('edit', { id: dupeId, type })
    onComplete()
  }, [onComplete, router, type, client, doc])

  if (!isPermissionsLoading && !permissions?.granted) {
    return {
      icon: CopyIcon,
      disabled: true,
      label: 'Duplicate',
      title: (
        <InsufficientPermissionsMessage
          context="duplicate-document"
          currentUser={currentUser}
        />
      ),
    }
  }

  return {
    icon: CopyIcon,
    disabled:
      isDuplicating || Boolean(duplicate.disabled) || isPermissionsLoading,
    label: isDuplicating ? 'Duplicating…' : 'Duplicate',
    title:
      (duplicate.disabled &&
        DISABLED_REASON_TITLE[
          duplicate.disabled as keyof typeof DISABLED_REASON_TITLE
        ]) ||
      '',
    onHandle: handle,
  }
}

DuplicateTranslatedDocumentAction.action = 'duplicate'
