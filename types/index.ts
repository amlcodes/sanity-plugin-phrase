import {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
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
