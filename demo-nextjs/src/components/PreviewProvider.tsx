'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { suspend } from 'suspend-react'

const LiveQueryProvider = dynamic(() => import('next-sanity/preview'))

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

  if (pathname.startsWith('/studio')) return children

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
        Preview mode
      </div>
    </LiveQueryProvider>
  )
}
