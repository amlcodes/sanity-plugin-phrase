import fs from 'fs'

export const exampleDocuments = fs
  .readdirSync('example-data/sanity-documents')
  .map((filename) => ({
    filename,
    document: JSON.parse(
      fs.readFileSync(`example-data/sanity-documents/${filename}`, 'utf-8'),
    ),
  }))
