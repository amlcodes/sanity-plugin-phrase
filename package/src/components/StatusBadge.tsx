import {
  CheckmarkCircleIcon,
  ClockIcon,
  CloseIcon,
  InfoOutlineIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import { Badge, BadgeTone, Card, CardTone, Flex, Text } from '@sanity/ui'
import {
  getReadableLanguageName,
  jobIsCancelled,
  jobIsComplete,
} from '../utils'
import { PhraseJobInfo, SanityLangCode, StaleStatus } from '../types'

export default function StatusBadge(
  props: {
    language?: SanityLangCode
    label: string
  } & (
    | {
        jobStatus: PhraseJobInfo['status']
      }
    | {
        staleStatus: StaleStatus
      }
  ),
) {
  const { language } = props
  const tone =
    'jobStatus' in props
      ? getJobTone(props.jobStatus)
      : getStaleTone(props.staleStatus)
  const Icon =
    'jobStatus' in props
      ? getJobIcon(props.jobStatus)
      : getStaleIcon(props.staleStatus)
  return (
    <Card tone={tone} border={false} style={{ background: 'transparent' }}>
      <Flex gap={1} style={{ alignItems: 'center' }}>
        {language && (
          <Text muted size={1}>
            {getReadableLanguageName(language)}
          </Text>
        )}
        <Icon />{' '}
        <Badge mode="outline" tone={tone} size={1}>
          {props.label}
        </Badge>
      </Flex>
    </Card>
  )
}

function getJobIcon(jobStatus: PhraseJobInfo['status']) {
  if (jobIsCancelled({ status: jobStatus })) {
    return CloseIcon
  }

  if (jobIsComplete({ status: jobStatus })) {
    return CheckmarkCircleIcon
  }

  return ClockIcon
}

function getJobTone(jobStatus: PhraseJobInfo['status']): BadgeTone & CardTone {
  if (jobIsCancelled({ status: jobStatus })) {
    return 'critical'
  }

  if (jobIsComplete({ status: jobStatus })) {
    return 'positive'
  }

  if (jobStatus === 'ACCEPTED') {
    return 'primary'
  }

  return 'default'
}

const STALE_MAP: Record<
  StaleStatus,
  { tone: BadgeTone & CardTone; icon: typeof CloseIcon }
> = {
  [StaleStatus.UNTRANSLATABLE]: {
    tone: 'default',
    icon: CloseIcon,
  },
  [StaleStatus.UNTRANSLATED]: {
    tone: 'caution',
    icon: InfoOutlineIcon,
  },
  [StaleStatus.STALE]: {
    tone: 'caution',
    icon: WarningOutlineIcon,
  },
  [StaleStatus.FRESH]: {
    tone: 'positive',
    icon: CheckmarkCircleIcon,
  },
  [StaleStatus.ONGOING]: {
    tone: 'primary',
    icon: ClockIcon,
  },
}

function getStaleTone(staleStatus: StaleStatus) {
  return STALE_MAP[staleStatus].tone
}

function getStaleIcon(staleStatus: StaleStatus) {
  return STALE_MAP[staleStatus].icon
}
