import createTranslations from './src/createTranslations'
import handlePhraseWebhook from './src/handlePhraseWebhook'
import fs from 'fs'
import { phraseClient } from './src/phraseClient'

// Doc with PT
createTranslations({
  templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
  sourceDoc: {
    _id: 'drafts.a80f2791-d4e4-45eb-84d0-1a59fe78edbc',
    _rev: '6A1LlYz54jYGCn2JRsJo36',
    _type: 'post',
    lang: 'en',
  },
  targetLangs: ['pt'],
  paths: [['title'], ['slug'], ['body']],
})

// Tiny doc
// createTranslations({
//   templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
//   sourceDoc: {
//     _id: 'drafts.a80f2791-d4e4-45eb-84d0-1a59fe78edbc',
//     _rev: '9c0ac4c3-faa5-4144-8d72-5c2f058e611a',
//     _type: 'post',
//     lang: 'en',
//   },
//   targetLangs: ['pt'],
// })

// handlePhraseWebhook(
//   JSON.parse(
//     fs.readFileSync('example-data/webhooks/test-payload.json', 'utf8'),
//   ),
// )

// async function test() {
//   // const a = await phraseClient.jobs.getPreview({
//   //   projectUid: '1k06sGrqh0d5uE7u0ON0xV0',
//   //   jobUid: 'fDVRUm35dXV68lOGB55ec2',
//   // })
//   // console.log(a)
// }

// test()
