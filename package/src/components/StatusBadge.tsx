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
import styled from 'styled-components'
import { ComponentProps } from 'react'

const StyledCard = styled(Card)`
  &[data-in-table='true'] {
    container-type: inline-size;

    @container (max-width: 180px) {
      & > *[data-ui='Flex'] {
        flex-wrap: wrap;
      }
    }
  }
`

const StyledBadge = styled(Badge)`
  white-space: nowrap;

  span {
    text-overflow: ellipsis;
    overflow: hidden;
  }
`

export default function StatusBadge(
  props: {
    language?: SanityLangCode
    label: string
    badgeProps?: ComponentProps<typeof StyledBadge>
    inTable?: boolean
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
    <StyledCard
      tone={tone}
      border={false}
      {...props.badgeProps}
      style={{ background: 'transparent', ...(props.badgeProps?.style || {}) }}
      data-in-table={!!props.inTable}
    >
      <Flex gap={2} align="center">
        {language && (
          <Text muted size={1}>
            {getReadableLanguageName(language)}
          </Text>
        )}
        <Text muted size={1}>
          <Icon />
        </Text>
        <StyledBadge mode="outline" tone={tone} size={1}>
          {props.label}
        </StyledBadge>
      </Flex>
    </StyledCard>
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

export const STALE_MAP: Record<
  StaleStatus,
  { tone: BadgeTone & CardTone; icon: typeof CloseIcon; label: string }
> = {
  [StaleStatus.UNTRANSLATABLE]: {
    tone: 'default',
    icon: CloseIcon,
    label: 'Unstranslatable',
  },
  [StaleStatus.UNTRANSLATED]: {
    tone: 'caution',
    icon: InfoOutlineIcon,
    label: 'Untranslated',
  },
  [StaleStatus.STALE]: {
    tone: 'caution',
    icon: WarningOutlineIcon,
    label: 'Outdated',
  },
  [StaleStatus.FRESH]: {
    tone: 'positive',
    icon: CheckmarkCircleIcon,
    label: 'Up to date',
  },
  [StaleStatus.ONGOING]: {
    tone: 'primary',
    icon: ClockIcon,
    label: 'Ongoing',
  },
}

function getStaleTone(staleStatus: StaleStatus) {
  return STALE_MAP[staleStatus].tone
}

function getStaleIcon(staleStatus: StaleStatus) {
  return STALE_MAP[staleStatus].icon
}
