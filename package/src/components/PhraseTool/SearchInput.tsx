import { SearchIcon, SpinnerIcon } from '@sanity/icons'
import { Card, TextInput } from '@sanity/ui'
import styled, { keyframes } from 'styled-components'

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const AnimatedSpinnerIcon = styled(SpinnerIcon)`
  animation: ${rotate} 500ms linear infinite;
`

const SearchCard = styled(Card)`
  [data-ui='TextInput'] {
    border-radius: inherit;
  }
`

// Adapted from:
// https://github.com/sanity-io/sanity/blob/next/packages/sanity/src/desk/panes/documentList/DocumentListPane.tsx#L216
export function SearchInput(props: {
  searchQuery: string
  setSearchQuery: (newQuery: string) => void
  loading: boolean
}) {
  return (
    <SearchCard radius={4} tone="transparent" flex={1}>
      <TextInput
        aria-label="Search documents"
        placeholder="Search documents"
        autoComplete="off"
        border={false}
        clearButton={Boolean(props.searchQuery)}
        fontSize={2}
        padding={3}
        icon={props.loading ? AnimatedSpinnerIcon : SearchIcon}
        onChange={(e) => props.setSearchQuery(e.currentTarget.value)}
        onClear={() => props.setSearchQuery('')}
        radius={2}
        spellCheck={false}
        value={props.searchQuery}
      />
    </SearchCard>
  )
}
