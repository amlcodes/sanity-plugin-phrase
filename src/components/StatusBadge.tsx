import { CheckmarkCircleIcon, ClockIcon, CloseIcon } from '@sanity/icons'
import { Badge, BadgeTone, Card, CardTone, Flex, Text } from '@sanity/ui'
import {
  getReadableLanguageName,
  jobIsCancelled,
  jobIsComplete,
} from '../utils'
import { PhraseJobInfo, SanityLangCode } from '../types'

export default function StatusBadge({
  language,
  step,
  status,
}: {
  language?: SanityLangCode
  step: string
  status: PhraseJobInfo['status']
}) {
  const tone = getTone(status)
  const Icon = getIcon(status)
  return (
    <Card tone={tone} border={false} style={{ background: 'transparent' }}>
      <Flex gap={1} style={{ alignItems: 'center' }}>
        {language && <Text size={1}>{getReadableLanguageName(language)}</Text>}
        <Icon />{' '}
        <Badge mode="outline" tone={tone} size={1}>
          {step}
        </Badge>
      </Flex>
    </Card>
  )
}

function getIcon(status: PhraseJobInfo['status']) {
  if (jobIsCancelled({ status })) {
    return CloseIcon
  }

  if (jobIsComplete({ status })) {
    return CheckmarkCircleIcon
  }

  return ClockIcon
}

function getTone(status: PhraseJobInfo['status']): BadgeTone & CardTone {
  if (jobIsCancelled({ status })) {
    return 'critical'
  }

  if (jobIsComplete({ status })) {
    return 'positive'
  }

  if (status === 'ACCEPTED') {
    return 'primary'
  }

  return 'default'
}
