import createTranslations from './createTranslations'

createTranslations({
  templateUid: '1dIg0Pc1d8kLUFyM0tgdmt',
  document: {
    _createdAt: '2023-10-17T21:50:58Z',
    _id: 'db16b562-bd32-42fd-8c39-35eb3bd7ddb7',
    _rev: 'T1lOlhDpTBo4zpIQo1p1SW',
    _type: 'post',
    _updatedAt: '2023-10-17T21:50:58Z',
    author: {
      _ref: 'd0d00e98-81e5-40d1-aed4-f2bdd5b085bf',
      _type: 'reference',
    },
    notHtml1:
      "This one I'm writing with <beautiful> supposedly HTML tags, but they don't close",
    notHtmlUnwrapped:
      "This other has <b>one element</b>, and that's it - should it be HTML?",
    notHtml2: "<p This one starts with an angle bracket, but it's not HTML",
    notHtml3: 'This one has a <p> tag, but it is not HTML',
    body: `<div>
      <p>The integration of Phrase.com with Sanity.io presents an exciting development for content creators and developers. Phrase.com is a powerful translation management system (TMS) that helps streamline the localization process, while Sanity.io is a popular headless CMS or content platform designed to offer flexibility and scalability. Together, this integration enables seamless translation workflows within the Sanity.io environment.</p>
      <p>Phrase.com is a cloud-based translation management system that helps streamline the localization process. It offers a wide range of features, including:</p>
      <ul>
        <li>Translation memory</li>
        <li>Machine translation</li>
        <li>Translation editor</li>
        <li>Translation glossary</li>
        <li>Translation API</li>
      </ul>
      <button title="Sign up to Phrase">Sign up now</button>
    </div>
    `,
    language: 'en',
    slug: {
      _type: 'slug',
      current: 'the-new-sanity-io-phrase-integration',
    },
    title: 'The new Sanity.io Phrase integration',
  },
})
