import { Box, Flex, Spinner } from '@sanity/ui'

export default function SpinnerBox() {
  return (
    <Box paddingY={4}>
      <Flex height={'fill'} align="center" justify="center">
        <Spinner muted size={2} />
      </Flex>
    </Box>
  )
}
