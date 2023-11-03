import {
  Path,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SanityDocument,
} from '@sanity/types'
import { phraseClient } from '../phraseClient'
import { pathToString } from '../utils'
import { definitions } from './phraseOpenAPI'

export type Phrase = {
  JobPart: definitions['JobPartReference']
  JobInWebhook: Omit<Phrase['JobPart'], 'filename'> & {
    fileName: string
    project: {
      id: string
      uid: string
      lastWorkflowLevel?: number | null
    }
  }
  CreatedProject: Awaited<
    ReturnType<typeof phraseClient.projects.create>
  >['data']
}

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

export type MainDocTranslationMetadata = {
  _type: 'phrase.mainDoc.meta'
  /** @see getTranslationKey */
  _key: string
  _createdAt: string
  sourceDocRev: string
  projectName: string
  filename: string
  paths: Path[]
} & (
  | {
      status: 'CREATING'
    }
  | {
      status: 'CREATED' | 'COMPLETED'
      targetLangs: string[]
      projectUid: string
    }
)

export type PhraseJobInfo = Pick<
  Phrase['JobPart'],
  | 'uid'
  | 'status'
  | 'dateDue'
  | 'dateCreated'
  | 'workflowLevel'
  | 'workflowStep'
  | 'providers'
> & {
  _type: 'phrase.job'
  _key: string
}

export type PtdTranslationMetadata = {
  _type: 'phrase.ptd.meta'
  sourceFileUid?: string
  dateCreated?: string
  targetLang: string
  sourceLang: string
  filename?: string
  jobs: PhraseJobInfo[]
  paths: Path[]
  projectUid: string
}

export type SanityDocumentWithPhraseMetadata = SanityDocument & {
  /** For main documents (source and translated) only */
  phraseTranslations?: MainDocTranslationMetadata[] | null

  /** For PTDs (Phrase Translation Documents) only */
  phrasePtd?: PtdTranslationMetadata
}

export type SanityTranslationDocPair = {
  lang: string
  draft?: SanityDocumentWithPhraseMetadata | null
  published?: SanityDocumentWithPhraseMetadata | null
}

export interface TranslationRequest {
  sourceDoc: {
    _rev: string
    _id: string
    _type: string
    lang: string
  }
  paths: Path[]
  targetLangs: string[]
  templateUid: string
  // @TODO: schema
}

export type ContentInPhrase = {
  _sanityRev: string
  /** HTML content to show in Phrase's "Context note" in-editor panel */
  _sanityContext?: string
  /**
   * The formatted content sent to Phrase by field path.
   * Keys are the result of `@sanity/util/paths`'s `toString(path)` and need to be decoded back to `Path` before usage.
   *
   * @example
   * // Document-level translations (entire document)
   * {
   *  contentByPath: {
   *    __root: {
   *      _id: 'document-id' // ...
   *    }
   *  }
   * }
   *
   * // Field-level translations
   * {
   *  contentByPath: {
   *    title: 'Document title',
   *    "body[_key == 'block-1'].cta": { _type: 'cta', title: 'CTA title' }
   *  }
   * }
   **/
  contentByPath: Record<ReturnType<typeof pathToString>, unknown>
}
