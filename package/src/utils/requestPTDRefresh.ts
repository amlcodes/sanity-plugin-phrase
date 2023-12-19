import { RefreshPTDByIdResponse } from '../refreshTranslation/refreshPTDById'
import { EndpointActionTypes, PhrasePluginOptions } from '../types'
import { isPtdId } from './ids'

export default async function requestPTDRefresh({
  ptdId,
  apiEndpoint,
}: Pick<PhrasePluginOptions, 'apiEndpoint'> & {
  ptdId: string
}): Promise<
  { success: true } | ({ success: false } & RefreshPTDByIdResponse['body'])
> {
  if (!isPtdId(ptdId)) {
    return {
      success: false,
      error: 'InvalidPTDId',
    }
  }

  try {
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        action: EndpointActionTypes.REFRESH_PTD,
        ptdId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (res.ok) {
      return { success: true }
    }

    const resBody = (await res.json().catch(() => ({
      error: 'Unknown error',
    }))) as RefreshPTDByIdResponse['body']
    return { success: false, ...resBody }
  } catch (error) {
    return {
      success: false,
      error: 'UnknownPhraseClientError',
    }
  }
}
