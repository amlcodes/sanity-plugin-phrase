import { METADATA_KEY } from '../types'

export const CREDENTIALS_DOC_ID = 'phrase.credentials'
export const CREDENTIALS_DOC_TYPE = CREDENTIALS_DOC_ID

export const FILENAME_PREFIX = '[Sanity.io]'

export const ROOT_PATH_STR = '__root'

export const SANITY_API_VERSION = '2023-11-24'

export const PTD_ID_PREFIX = 'phrase.ptd'

export const TMD_ID_PREFIX = 'phrase.tmd'
export const TMD_TYPE = TMD_ID_PREFIX

export const NOT_PTD = `${METADATA_KEY}._type != "phrase.ptd.meta"`

export const STATIC_DOC_KEYS = ['_id', '_rev', '_type', METADATA_KEY] as const
