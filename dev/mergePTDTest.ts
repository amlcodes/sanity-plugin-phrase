import mergePTD from '../src/mergePTD'
import { SanityPTD } from '../src/types'
import { testSanityClient } from './testSanityClient'

const ptdId = 'phrase.ptd.pt--__root__yblsDKVOfabu1vzRxm3I9j'

const PTD = await testSanityClient.getDocument<SanityPTD>(ptdId)

if (!PTD) {
  throw new Error(`No PTD found for id ${ptdId}`)
}

const response = await mergePTD({
  sanityClient: testSanityClient,
  PTD,
})

console.log({ final: response })
