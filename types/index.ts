import {
  Path,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SanityDocument,
} from '@sanity/types'

export * from './CreatedJobs'
export * from './CreatedProject'

export type SerializedPtBlock = {
  _type: 'block'
  _blockMeta: Omit<PortableTextTextBlock, 'children' | 'markDefs'>
  _spanMeta: {
    [spanKey: string]: Omit<PortableTextSpan, 'text'>
  }
  inlineBlocksData: {
    [blockKey: string]: PortableTextObject
  }
  serializedHtml: string
  markDefs: PortableTextTextBlock['markDefs']
}

export enum SerializedPtHtmlTag {
  SPAN = 's',
  BLOCK = 'c-b',
}

export type SanityDocumentWithPhraseMetadata = SanityDocument & {
  phraseTranslations?:
    | {
        _type: 'phrase.mainDoc.meta'
        _key: string
        projectName: string
        path: Path
        status: 'CREATING' | 'CREATED'
        targetLangs?: string[]
        filename?: string
        projectId?: string
      }[]
    | null
}

export type SanityTranslationDocPair = {
  lang: string
  draft?: SanityDocumentWithPhraseMetadata | null
  published?: SanityDocumentWithPhraseMetadata | null
}

export interface TranslationRequest {
  sourceDoc: {
    _id: string
    _type: string
    lang: string
  }
  path: Path
  targetLangs: string[]
  templateUid: string
  // @TODO: schema
}
