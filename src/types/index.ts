import {
  Path,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Reference,
  SanityDocument,
} from '@sanity/types'
import { pathToString } from '../utils'
import { definitions } from './phraseOpenAPI'
import { CREDENTIALS_DOC_ID } from '../utils/constants'
import { PhraseClient } from '../createPhraseClient'

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
    ReturnType<PhraseClient['projects']['create']>
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
  _type: 'phrase.mainDoc.translation'
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
      targetLangs: CrossSystemLangCode[]
      projectUid: string
    }
)

/** For main documents (source and translated) only */
export type MainDocPhraseMetadata = {
  _type: 'phrase.main.meta'
  translations: MainDocTranslationMetadata[]
}

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

/** For PTDs (Phrase Translation Documents) only */
export type PtdPhraseMetadata = {
  _type: 'phrase.ptd.meta'
  sourceDoc: Reference
  sourceFileUid?: string
  dateCreated?: string
  targetLang: CrossSystemLangCode
  sourceLang: CrossSystemLangCode
  filename?: string
  jobs: PhraseJobInfo[]
  paths: Path[]
  projectUid: string
}

export type SanityDocumentWithPhraseMetadata = SanityDocument & {
  phraseMeta?: MainDocPhraseMetadata | PtdPhraseMetadata
}

export type SanityTranslationDocPair = {
  lang: CrossSystemLangCode
  draft?: SanityDocumentWithPhraseMetadata | null
  published?: SanityDocumentWithPhraseMetadata | null
}

export interface TranslationRequest {
  sourceDoc: {
    _rev: string
    _id: string
    _type: string
    lang: CrossSystemLangCode
  }
  paths: Path[]
  targetLangs: CrossSystemLangCode[]
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

export interface PhraseCredentialsDocument extends SanityDocument {
  _id: typeof CREDENTIALS_DOC_ID
  _type: typeof CREDENTIALS_DOC_ID
  userName?: string
  password?: string
  token?: string
  /** ISO date */
  expires?: string
}

export type CrossSystemLangCode = {
  /** Whatever language code set by the i18nAdapter */
  sanity: SanityLangCode
  /**
   * Phrase uses a non-standard variation of IETF language tags.
   * @see https://en.wikipedia.org/wiki/IETF_language_tag
   * @docs https://cloud.memsource.com/web/docs/api#operation/listOfLanguages
   **/
  phrase: PhraseLangCode
}

export type PhraseLangCode = string
export type SanityLangCode = string
