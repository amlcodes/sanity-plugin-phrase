import { SanityClient } from '@sanity/client'
import {
  Path,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Reference,
  SanityDocument,
} from '@sanity/types'
import { PhraseClient } from '../createPhraseClient'
import { pathToString } from '../utils'
import { CREDENTIALS_DOC_ID } from '../utils/constants'
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

export interface ReferenceMap {
  [referencedSourceLangDocId: string]:
    | 'untranslatable' // for document types that aren't localized
    | 'doc-not-found'
    | {
        targetLanguageDocId: string | null
        _type: string
        state: 'draft' | 'published' | 'both'
      }
}

/** For PTDs (Phrase Translation Documents) only */
export type PtdPhraseMetadata = {
  _type: 'phrase.ptd.meta'
  sourceDoc: Reference
  targetDoc: Reference
  sourceFileUid?: string
  dateCreated?: string
  targetLang: CrossSystemLangCode
  sourceLang: CrossSystemLangCode
  filename?: string
  jobs: PhraseJobInfo[]
  paths: Path[]
  projectUid: string

  /** Cache of resolved documents referenced by the current PTD */
  referenceMap?: ReferenceMap
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

export type DocPairFromAdapter = Omit<SanityTranslationDocPair, 'lang'> & {
  lang: SanityLangCode
}

/**
 * @TODO:
 * - getTranslatedReferences
 * - getOrCreateTranslatedDocuments
 */
export type I18nAdapter = {
  /**
   * Given the current translation request, fetches the fresh versions of the
   * requested document and target languages.
   *
   * It should return documents for ALL requested languages, so this function should
   * create them if they don't exist.
   */
  getOrCreateTranslatedDocuments: (
    props: TranslationRequest & { sanityClient: SanityClient },
  ) => Promise<DocPairFromAdapter[]>

  getTranslatedReferences: (props: {
    sanityClient: SanityClient
    references: string[]
    targetLanguage: SanityLangCode
  }) => Promise<ReferenceMap>

  langAdapter: {
    toSanity: (phraseLang: PhraseLangCode) => SanityLangCode
    toPhrase: (sanityLang: SanityLangCode) => PhraseLangCode
  }

  injectDocumentLang: (
    document: SanityDocumentWithPhraseMetadata,
    lang: SanityLangCode,
  ) => SanityDocumentWithPhraseMetadata
  getDocumentLang: (
    document: SanityDocumentWithPhraseMetadata,
  ) => SanityLangCode | null
}
