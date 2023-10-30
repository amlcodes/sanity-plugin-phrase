// import { Document, Mutation, arrayToJSONMatchPath } from '@sanity/mutator'
import createTranslations from './createTranslations'
import { sanityClient } from './sanityClient'
// import { get } from '@sanity/util/paths'

createTranslations({
  templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
  sourceDoc: {
    _id: 'db16b562-bd32-42fd-8c39-35eb3bd7ddb7',
    _type: 'post',
    lang: 'en',
  },
  targetLangs: ['pt'],
})
