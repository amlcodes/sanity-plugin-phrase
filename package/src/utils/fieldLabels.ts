import { Path, SchemaType } from 'sanity'
import { ROOT_PATH_STR, dedupeArray, truncate } from '.'

export function getFieldLabel(
  rootPath: string,
  fullPathsInRoot: Path[],
  schemaType: SchemaType,
) {
  if (rootPath === ROOT_PATH_STR) {
    return 'Entire document'
  }

  const fields =
    'fields' in schemaType && Array.isArray(schemaType.fields)
      ? schemaType.fields
      : []
  const field = fields.find((f) => f.name === rootPath)

  if (!field) {
    return `Unknown field: ${rootPath}`
  }

  const rootFieldTitle = truncate(field.type.title || rootPath, 30)

  if (fullPathsInRoot.length === 1 || field.type.name === 'slug') {
    return rootFieldTitle
  }

  const count = fullPathsInRoot.length

  if (field.type.name === 'array') {
    let subLabel = `${count} item${count > 1 ? 's' : ''}`

    if (fullPathsInRoot.every((path) => typeof path[1] === 'number')) {
      subLabel = `item${count > 1 ? 's' : ''} ${fullPathsInRoot
        .map((p) => `#${(p[1] as number) + 1}`)
        .join(', ')}`
    }

    return `${rootFieldTitle} (${subLabel})`
  }

  const subFields = dedupeArray(
    fullPathsInRoot.map((p) => {
      const subfield =
        ('fields' in field.type &&
          field.type.fields.find((f) => f.name === p[1])) ||
        undefined

      return subfield?.type?.title || p[1]
    }),
  ).join(', ')
  return `${rootFieldTitle} (${subFields})`
}
