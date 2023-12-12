// Adapted from https://github.com/sanity-io/sanity/blob/next/packages/sanity/src/desk/components/paneItem/PaneItem.tsx

import { DocumentIcon } from '@sanity/icons'
import React, { useMemo } from 'react'
import type { CollatedHit, SanityDocument, SchemaType } from 'sanity'
import {
  PreviewCard,
  useDocumentPresence,
  useDocumentPreviewStore,
  useSchema,
} from 'sanity'
import { IntentLink } from 'sanity/router'
import { MissingSchemaType } from './MissingSchemaType'
import { PaneItemPreview } from './PaneItemPreview'

interface DocumentPreviewProps {
  schemaType?: SchemaType
  docPair: CollatedHit<SanityDocument>
  openOnClick?: boolean
}

/**
 * Return `false` if we explicitly disable the icon.
 * Otherwise return the passed icon or the schema type icon as a backup.
 */
export function getIconWithFallback(
  icon: React.ComponentType<any> | false | undefined,
  schemaType: SchemaType | undefined,
  defaultIcon: React.ComponentType<any>,
): React.ComponentType<any> | false {
  if (icon === false) {
    return false
  }

  return (
    icon || ((schemaType && schemaType.icon) as any) || defaultIcon || false
  )
}

export function DocumentPreview(props: DocumentPreviewProps) {
  const { schemaType, docPair, openOnClick = true } = props
  const doc = docPair?.draft || docPair?.published
  const id = docPair.id || ''
  const documentPreviewStore = useDocumentPreviewStore()
  const schema = useSchema()
  const documentPresence = useDocumentPresence(id)
  const hasSchemaType = Boolean(
    schemaType && schemaType.name && schema.get(schemaType.name),
  )

  const PreviewComponent = useMemo(() => {
    if (!doc) return null

    if (!schemaType || !hasSchemaType) {
      return <MissingSchemaType value={doc as SanityDocument} />
    }

    return (
      <PaneItemPreview
        documentPreviewStore={documentPreviewStore}
        icon={getIconWithFallback(undefined, schemaType, DocumentIcon)}
        schemaType={schemaType}
        layout="default"
        value={doc}
        presence={documentPresence}
      />
    )
  }, [hasSchemaType, schemaType, documentPresence, doc, documentPreviewStore])

  if (!openOnClick) {
    return (
      <PreviewCard data-ui="PaneItem" padding={2} radius={2} tone="inherit">
        {PreviewComponent}
      </PreviewCard>
    )
  }

  return (
    <PreviewCard
      __unstable_focusRing
      // @ts-expect-error
      as={IntentLink}
      data-as="a"
      data-ui="PaneItem"
      padding={2}
      radius={2}
      tone="inherit"
      intent="edit"
      params={{ id: docPair.id, type: docPair.type }}
    >
      {PreviewComponent}
    </PreviewCard>
  )
}
