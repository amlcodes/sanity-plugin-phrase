import { ChevronUpIcon } from '@sanity/icons'
import { Button, Card, Flex, Heading, Stack } from '@sanity/ui'
import { PropsWithChildren, ReactNode, useRef } from 'react'
import styled from 'styled-components'
import { PhraseMonogram } from './PhraseLogo'

const Accordion = styled(Stack)`
  > *:not(:first-child) {
    margin-top: 0.75rem;
  }
  &:not([open]) summary button[aria-hidden]:last-of-type svg {
    transform: rotate(180deg);
  }
`

export default function DocDashboardCard(
  props: PropsWithChildren<{
    title: string
    subtitle?: ReactNode
    headerActions?: ReactNode
    collapsible?: boolean
  }>,
) {
  const { collapsible = true } = props
  const summaryRef = useRef<HTMLDivElement>(null)

  return (
    <Card style={{ padding: '0.9375rem' }} border radius={1}>
      <Accordion as={collapsible ? 'details' : 'div'}>
        <Flex
          as={collapsible ? 'summary' : 'div'}
          align="flex-start"
          gap={2}
          ref={summaryRef}
        >
          <Stack space={3} flex={1} tabIndex={0} style={{ userSelect: 'text' }}>
            <Flex gap={2} align="center">
              <PhraseMonogram
                style={{
                  height: '1.5625em',
                  width: 'auto',
                  marginLeft: '-0.25em',
                }}
              />{' '}
              <Heading as="h2" size={1} style={{ fontWeight: '600' }}>
                {props.title}
              </Heading>
            </Flex>
            {props.subtitle || null}
          </Stack>
          {props.headerActions || null}
          {collapsible && (
            <Button
              fontSize={1}
              padding={2}
              icon={ChevronUpIcon}
              mode="bleed"
              onClick={(e) => {
                e.stopPropagation()
                summaryRef?.current?.click?.()
              }}
              aria-hidden
            />
          )}
        </Flex>

        {props.children}
      </Accordion>
    </Card>
  )
}
