import { CREDENTIALS_DOC_ID, CREDENTIALS_DOC_TYPE } from '../src/utils'
import { testSanityClient } from '../src/testSanityClient'

async function createCredentialsDoc() {
  const userName = process.env.PHRASE_USERNAME
  const password = process.env.PHRASE_PASSWORD

  await testSanityClient.createOrReplace({
    _id: CREDENTIALS_DOC_ID,
    _type: CREDENTIALS_DOC_TYPE,
    userName,
    password,
    region: 'us',
  })
}

createCredentialsDoc()
