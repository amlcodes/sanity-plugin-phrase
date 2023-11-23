import { defineField, defineArrayMember } from 'sanity'
import { getReadableLanguageName } from '../src/utils'

export const translatableTypes = ['post']

export const post = {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'phraseDashboard',
      title: 'Phrase Dashboard',
      type: 'string',
      readOnly: true,
    }),
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
      of: [
        defineArrayMember({
          type: 'reference',
          to: { type: 'post' },
        }),
      ],
    }),
    // defineField({
    //   name: 'body',
    //   title: 'Body',
    //   type: 'blockContent',
    // }),
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
}

const testSchema = [post]

export default testSchema
