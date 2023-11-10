import { SlugValidationContext } from '@sanity/types'
import { defineField, defineType } from 'sanity'

import { apiVersion } from '~/lib/sanity.api'
import { draftId, getReadableLanguageName, undraftId } from '~/utils'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      validation: (Rule) => Rule.required(),
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: isUniqueOtherThanLanguage,
      },
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'relatedPosts',
      title: 'Related posts',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'post' } }],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
    defineField({
      name: 'language',
      type: 'string',
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'phraseMeta',
      type: 'object',
      readOnly: true,
      hidden: true,
      fields: [
        {
          name: 'fakefield',
          type: 'string',
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      language: 'language',
      author: 'author.name',
      media: 'mainImage',
      translations: 'phraseMeta.translations',
    },
    prepare(selection) {
      const hasTranslations = selection.translations?.find(
        (t) => t.status !== 'COMPLETED',
      )
      return {
        ...selection,
        subtitle: [
          hasTranslations && 'WIP Phrase',
          getReadableLanguageName(selection.language),
        ]
          .filter(Boolean)
          .join(' - '),
      }
    },
  },
})

// Create the function
// This checks that there are no other documents
// With this published or draft _id
// Or this schema type
// With the same slug and language
export async function isUniqueOtherThanLanguage(
  slug: string,
  context: SlugValidationContext,
) {
  const { document, getClient } = context
  if (!document?.language) {
    return true
  }
  const client = getClient({ apiVersion })
  const id = document._id.replace(/^drafts\./, '')

  const usedInOtherDocument = await client.fetch<boolean>(
    /* groq */ `defined(*[
      !(_id in [$draft, $published]) &&
      slug.current == $slug &&
      phraseMeta._type != 'phrase.ptd.meta' &&
      language == $language
    ][0]._id)`,
    {
      draft: draftId(id),
      published: undraftId(id),
      language: document.language,
      slug,
    },
  )

  return !usedInOtherDocument
}
