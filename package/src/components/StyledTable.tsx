'use client'
import { PropsWithChildren } from 'react'
import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'

function getTallestCell(rowEl: HTMLTableRowElement) {
  const cells = Array.from(
    rowEl.querySelectorAll('td'),
  ) as HTMLTableCellElement[]
  return cells.reduce((tallest, cell) => {
    const contentsHeight = cell.children?.[0]?.getBoundingClientRect().height

    return contentsHeight > tallest ? contentsHeight : tallest
  }, 0)
}

export const TableRow = (props: PropsWithChildren<{}>) => {
  const rowRef = useRef<HTMLTableRowElement>(null)
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const rowEl = rowRef.current
    if (!rowEl) return undefined

    setRowHeight(getTallestCell(rowEl))
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!(entry instanceof HTMLTableRowElement)) return

        setRowHeight(getTallestCell(entry))
      }
    })

    resizeObserver.observe(rowEl)

    return () => {
      resizeObserver.unobserve(rowEl)
    }
  }, [])

  return (
    <tr
      ref={rowRef}
      style={
        {
          '--row-height': rowHeight ? `${rowHeight}px` : undefined,
        } as any
      }
    >
      {props.children}
    </tr>
  )
}

const StyledTable = styled.table`
  caption-side: bottom;
  border-collapse: collapse;
  border-spacing: 0;
  overflow-x: auto;
  width: 100%;

  th {
    vertical-align: bottom;
  }

  th,
  td {
    text-align: left;
    padding: 0.75rem 0.875rem;
    border-bottom: 1px solid var(--card-shadow-outline-color);
  }
  td {
    height: var(--row-height, 100%);
    vertical-align: top;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`

export const Table = (props: PropsWithChildren<{}>) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <StyledTable>{props.children}</StyledTable>
    </div>
  )
}
