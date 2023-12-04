import { SanityClient } from '@sanity/client'
import {
  Path,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Reference,
  SanityDocument,
  WeakReference,
} from 'sanity'
import {
  PhraseClient,
  PhraseDatacenterRegion,
} from './clients/createPhraseClient'
import { definitions } from './clients/phraseOpenAPI'
import type { LangAdapter } from './utils'
import { getTranslationKey, pathToString } from './utils'
import {
  CREDENTIALS_DOC_ID,
  PTD_ID_PREFIX,
  TMD_ID_PREFIX,
  TMD_TYPE,
} from './utils/constants'

export const METADATA_KEY = 'phraseMetadata'

export type PhraseLangCode = string
export type SanityLangCode = string

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

export interface TranslationRequest {
  // eslint-disable-next-line
  pluginOptions: PhrasePluginOptions
  phraseClient: PhraseClient
  sanityClient: SanityClient
  sourceDoc: {
    _rev: string
    _id: string
    _type: string
    lang: CrossSystemLangCode
  }
  paths: [Path, ...Path[]]
  /** @see getTranslationKey */
  translationKey: string
  targetLangs: CrossSystemLangCode[]
  templateUid: string
  dateDue?: string
  translationName: string
  translationFilename: `${TranslationRequest['translationName']}.json`
}

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
  ProjectStatus: Required<definitions['Admin, Project Manager']>['status']
  CreatedProject: Omit<definitions['AbstractProjectDtoV2'], 'uid'> & {
    uid: string
  }
  ProjectInWebhook: Phrase['CreatedProject'] & {
    status: Phrase['ProjectStatus']
  }
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
  // eslint-disable-next-line no-unused-vars
  SPAN = 's',
  // eslint-disable-next-line no-unused-vars
  BLOCK = 'c-b',
}

type BaseMainDocMetadata = {
  _type: 'phrase.main.translation'
  _key: TranslationRequest['translationKey']
  _createdAt: string
  sourceDoc: TranslationRequest['sourceDoc']
  /** Stringified `TranslationRequest['paths']` */
  paths: ReturnType<typeof JSON.stringify>
}

export type CreatingMainDocMetadata = BaseMainDocMetadata & {
  status: 'CREATING'
}

export type CommittedMainDocMetadata = BaseMainDocMetadata & {
  status: 'COMMITTED'
  tmd: Reference
  targetLangs: CrossSystemLangCode[]
}

export type CreatedMainDocMetadata = Omit<
  CommittedMainDocMetadata,
  'status'
> & {
  status: 'CREATED' | Phrase['ProjectStatus']
}

export type DeletedMainDocMetadata = Omit<
  CommittedMainDocMetadata,
  'status'
> & {
  status: 'DELETED'
}

export type FailedPersistingMainDocMetadata = BaseMainDocMetadata & {
  status: 'FAILED_PERSISTING'
  project: Phrase['CreatedProject']
  jobs: Phrase['JobPart'][]
  targetLangs: CrossSystemLangCode[]
}

export type MainDocTranslationMetadata =
  | CreatingMainDocMetadata
  | CommittedMainDocMetadata
  | CreatedMainDocMetadata
  | DeletedMainDocMetadata
  | FailedPersistingMainDocMetadata

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

export type ExistingReference = {
  _type: string
  targetLanguageDocId: string | null
  state: 'draft' | 'published' | 'both'
}

export interface ReferenceMap {
  [referencedSourceLangDocId: string]:
    | 'untranslatable' // for document types that aren't localized
    | 'doc-not-found'
    | ExistingReference
}

export type TMDTarget = {
  _key: SanityLangCode
  lang: CrossSystemLangCode
  ptd: WeakReference
  targetDoc: Reference
  jobs: PhraseJobInfo[]
  /** Cache of resolved references from source to target languages */
  referenceMap?: ReferenceMap
}

/** Translation Metadata Document (TMD)
 * Used for keeping permanent track of data in Phrase &
 * determining what fields are stale since last translation. */
export type SanityTMD = SanityDocument & {
  _type: typeof TMD_TYPE
  _id: `${typeof TMD_ID_PREFIX}.${ReturnType<typeof getTranslationKey>}`
  /** Stringified `SanityMainDoc` */
  sourceSnapshot: ReturnType<typeof JSON.stringify>
  sourceDoc: Reference
  sourceLang: CrossSystemLangCode
  targets: TMDTarget[]
  translationKey: TranslationRequest['translationKey']
  paths: TranslationRequest['paths']
  phraseProjectUid: string
  projectDueDate: string | null | undefined
}

/** For PTDs (Phrase Translation Documents) only */
export type PtdPhraseMetadata = {
  _type: 'phrase.ptd.meta'
  sourceDoc: Reference
  targetDoc: Reference
  tmd: Reference
  targetLang: CrossSystemLangCode
}

export type SanityDocumentWithPhraseMetadata = SanityDocument & {
  phraseMetadata?: MainDocPhraseMetadata | PtdPhraseMetadata
}

export type SanityPTD = SanityDocumentWithPhraseMetadata & {
  _id: `${typeof PTD_ID_PREFIX}.${PhraseLangCode}--${ReturnType<
    typeof getTranslationKey
  >}`
  phraseMetadata: PtdPhraseMetadata
}

export type SanityPTDWithExpandedMetadata = SanityPTD & {
  phraseMetadata: PtdPhraseMetadata & { expanded: SanityTMD }
}

/** A "main" document corresponds to either the source or target language */
export type SanityMainDoc = SanityDocument & {
  phraseMetadata: MainDocPhraseMetadata
}

export type SanityTranslationDocPair = {
  lang: CrossSystemLangCode
  draft?: SanityDocumentWithPhraseMetadata | null
  published?: SanityDocumentWithPhraseMetadata | null
}

export type ContentInPhrase = {
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

export type PhraseCredentialsInput = {
  userName: string
  password: string
  region: PhraseDatacenterRegion
}

export interface PhraseCredentialsDocument extends SanityDocument {
  _id: typeof CREDENTIALS_DOC_ID
  _type: typeof CREDENTIALS_DOC_ID
  token?: string
  /** ISO date */
  expires?: string
}

export type DocPairFromAdapter = Omit<SanityTranslationDocPair, 'lang'> & {
  lang: SanityLangCode
}

export type I18nAdapter = {
  /**
   * Given the current translation request, fetches the fresh versions of the
   * requested document and target languages.
   *
   * It should return documents for ALL requested languages, so this function should
   * create them if they don't exist.
   */
  getOrCreateTranslatedDocuments: (
    props: TranslationRequest,
  ) => Promise<DocPairFromAdapter[]>

  getTranslatedReferences: (props: {
    sanityClient: SanityClient
    references: string[]
    targetLang: SanityLangCode
    translatableTypes: readonly string[]
  }) => Promise<ReferenceMap>

  langAdapter: {
    toSanity: (phraseLang: PhraseLangCode) => SanityLangCode
    toPhrase: (sanityLang: SanityLangCode) => PhraseLangCode
  }

  injectDocumentLang: <Document extends SanityDocumentWithPhraseMetadata>(
    document: Document,
    lang: SanityLangCode,
  ) => Document
  getDocumentLang: (
    document: SanityDocumentWithPhraseMetadata,
  ) => SanityLangCode | null

  /**
   * @example
   * getLangGROQFilter: (lang) => `language == "${lang}"`
   */
  getLangGROQFilter: (lang: SanityLangCode) => string
}

export type CreateTranslationsInput = Omit<
  TranslationRequest,
  | 'paths'
  | 'targetLangs'
  | 'sourceDoc'
  | 'phraseClient'
  | 'translationKey'
  | 'translationFilename'
> & {
  credentials: PhraseCredentialsInput
  paths?: (Path | string)[]
  targetLangs: SanityLangCode[]
  sourceDoc: Omit<TranslationRequest['sourceDoc'], 'lang'> & {
    lang: SanityLangCode
  }
}

export type CreateMultipleTranslationsInput = {
  translations: Omit<
    CreateTranslationsInput,
    'sanityClient' | 'credentials' | 'pluginOptions'
  >[]
} & Pick<
  CreateTranslationsInput,
  'sanityClient' | 'credentials' | 'pluginOptions'
>

export enum EndpointActionTypes {
  // eslint-disable-next-line no-unused-vars
  REFRESH_PTD = 'REFRESH_PTD',
  // eslint-disable-next-line no-unused-vars
  CREATE_TRANSLATIONS = 'CREATE_TRANSLATIONS',
}

export interface ContextWithFreshDocuments {
  request: TranslationRequest
  freshSourceDoc: SanityDocumentWithPhraseMetadata
  freshDocuments: SanityTranslationDocPair[]
  freshDocumentsById: Record<string, SanityDocumentWithPhraseMetadata>
}

export interface ContextWithProject extends ContextWithFreshDocuments {
  project: Phrase['CreatedProject']
}

export interface ContextWithJobs extends ContextWithProject {
  jobs: Phrase['JobPart'][]
}

export enum StaleStatus {
  // eslint-disable-next-line no-unused-vars
  UNTRANSLATABLE = 'UNTRANSLATABLE',
  // eslint-disable-next-line no-unused-vars
  UNTRANSLATED = 'UNTRANSLATED',
  // eslint-disable-next-line no-unused-vars
  ONGOING = 'ONGOING',
  // eslint-disable-next-line no-unused-vars
  FRESH = 'FRESH',
  // eslint-disable-next-line no-unused-vars
  STALE = 'STALE',
}

export type StaleTargetStatus = {
  lang: CrossSystemLangCode
  status: StaleStatus.STALE
  changedPaths: TranslationRequest['paths']
  translationDate: string
}

export type TargetLangStaleness = {
  lang: CrossSystemLangCode
} & (
  | {
      error: unknown
    }
  | {
      status:
        | StaleStatus.ONGOING
        | StaleStatus.UNTRANSLATABLE
        | StaleStatus.UNTRANSLATED
    }
  | StaleTargetStatus
  | {
      status: StaleStatus.FRESH
      translationDate: string
    }
)

export type StaleResponse = {
  sourceDoc: TranslationRequest['sourceDoc']
  targets: TargetLangStaleness[]
}

export type PhrasePluginOptions = {
  langAdapter: LangAdapter
  /**
   * The i18n adapter to use for this plugin.
   * It'll be responsible for fetching and modifying documents for each target language.
   *
   * The plugin offers `documentInternationalizationAdapter` for Sanity's `@sanity/document-internationalization` package.
   */
  i18nAdapter: I18nAdapter
  /**
   * Schema types the plugin can translate
   *
   * @example
   * translatableTypes: ['post', 'page', 'lesson'] // etc.
   */
  translatableTypes: readonly string[]
  /**
   * Language code of all languages users can translate to.
   * Should be the same as the one stored in your Sanity documents and used by your front-end. The plugin will automatically translate it to Phrase's format.
   *
   * @example
   * supportedTargetLanguages: ['en-US', 'es-ES', 'fr-FR', 'pt', 'cz']
   */
  supportedTargetLangs: string[]
  /**
   * Language code of the source language that will be translated.
   * Should be the same as the one stored in your Sanity documents and used by your front-end. The plugin will automatically translate it to Phrase's format.
   *
   * @example
   * sourceLanguage: 'en'
   */
  sourceLang: string
  /**
   * The URL to your configured plugin backend API.
   *
   * **Note:** follow the steps for setting up the endpoint, outlined in the README
   * @example
   * backendEndpoint: 'https://my-front-end.com/api/sanity-phrase'
   * // Or relative to your Sanity studio's URL if same origin
   * backendEndpoint: '/api/phrase'
   */
  apiEndpoint: string
  /**
   * As defined by your Phrase account's settings
   * Either `eur` or `us`
   */
  phraseRegion: PhraseDatacenterRegion
  /**
   * Phrase project templates your editors can use when requesting translations.
   *
   * **Note:** follow the steps for setting templates, outlined in the README
   */
  phraseTemplates: {
    templateUid: string
    label: string
  }[]
}
