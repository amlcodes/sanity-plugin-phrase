'use client'

import { LiveQueryProvider } from 'next-sanity/preview'
import { usePathname, useSearchParams } from 'next/navigation'
import { PHRASE_CONFIG } from 'phraseConfig'
import { MouseEvent, useState } from 'react'
import { isPtdId, requestPTDRefresh } from 'sanity-plugin-phrase/utils'
import { suspend } from 'suspend-react'

// suspend-react cache is global, so we use a unique key to avoid collisions
const UniqueKey = Symbol('lib/sanity.client')

export default function PreviewProvider({
  children,
  token,
}: {
  children: React.ReactNode
  token?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previewedDocId = searchParams?.get('id')

  if (pathname?.startsWith('/studio')) return children

  const { client } = suspend(() => import('~/lib/sanity.client'), [UniqueKey])
  if (!token) throw new TypeError('Missing token')

  return (
    <LiveQueryProvider client={client} token={token} logger={console}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '1em',
          left: '1em',
          background: '',
        }}
      >
        {previewedDocId && (
          <p>
            <RefreshPTDButton previewedDocId={previewedDocId} />
          </p>
        )}
        Preview mode
      </div>
    </LiveQueryProvider>
  )
}

function RefreshPTDButton(props: { previewedDocId: string }) {
  const [state, setState] = useState<'idle' | 'refreshing'>('idle')

  if (!props.previewedDocId || !isPtdId(props.previewedDocId)) {
    return null
  }

  async function handleRefresh(e: MouseEvent) {
    e.preventDefault()

    setState('refreshing')
    const result = await requestPTDRefresh({
      ptdId: props.previewedDocId,
      apiEndpoint: PHRASE_CONFIG.apiEndpoint,
    })

    if (result.success === false) {
      // Notify users of errors as you see fit
    }

    setState('idle')
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={state === 'refreshing'}
      style={{
        background: '#1e61cd',
        color: 'white',
        padding: '1em 1.25em',
        cursor: 'pointer',
        border: 'none',
      }}
    >
      Refresh Phrase data
    </button>
  )
}
