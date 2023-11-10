import { LANGUAGES } from '~/utils'

export async function generateStaticParams() {
  return LANGUAGES.map((language) => ({ lang: language.id }))
}
