import React from 'react'
import { Tool } from 'sanity'
import { PhrasePluginOptions } from '../../types'

export default function PhraseTool({
  tool,
  ...props
}: {
  tool: Tool<PhrasePluginOptions>
}) {
  console.log({ tool, props })
  return <h1>here!</h1>
}
