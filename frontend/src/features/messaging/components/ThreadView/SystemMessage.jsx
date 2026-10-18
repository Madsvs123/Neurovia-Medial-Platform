import React from 'react';
import { Flex, Text, Badge, useColorModeValue } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

/**
 * Inline audit entry ("Alice picked up this request", "status → resolved").
 * Text is built from `message.meta` so it's translatable and consistent.
 */
export const systemText = (t, message) => {
  const meta = message.meta || {};
  const actor = meta.actorName || t('system.someone');
  switch (meta.event) {
    case 'joined': return t('system.joined', { actor: meta.username || actor });
    case 'left': return t('system.left', { actor });
    case 'claimed': return t('system.claimed', { actor });
    case 'assigned': return t('system.assigned', { actor, assignee: meta.assigneeName || '' });
    case 'unassigned': return t('system.unassigned', { actor });
    case 'status':
      return meta.auto ? t('system.statusAuto') : t('system.status', { actor, to: t(`status.${meta.to}`) });
    case 'priority': return t('system.priority', { actor, to: t(`priority.${meta.to}`) });
    case 'escalated': return t('system.escalated', { actor, team: t(`team.${meta.toTeam}`) });
    case 'reopened': return t('system.reopened', { actor });
    case 'participant_added': return t('system.participant_added', { actor, user: meta.username || '' });
    case 'participant_removed': return t('system.participant_removed', { actor, user: meta.username || '' });
    case 'sla_breached': return t('system.sla_breached', { hours: meta.hours });
    default: return meta.event || '';
  }
};

const SystemMessage = ({ message }) => {
  const { t } = useTranslation('messaging');
  const color = useColorModeValue('gray.500', 'gray.400');
  const isAlert = message.meta?.event === 'sla_breached';
  return (
    <Flex justify="center" my={2} role="status" data-testid="message-system">
      <Badge
        variant="subtle"
        colorScheme={isAlert ? 'red' : 'gray'}
        borderRadius="full"
        px={3}
        py={1}
        fontSize="11px"
        textTransform="none"
        fontWeight="medium"
        color={isAlert ? undefined : color}
      >
        {systemText(t, message)}
        <Text as="span" ml={2} opacity={0.6}>{dayjs(message.createdAt).format('h:mm A')}</Text>
      </Badge>
    </Flex>
  );
};

export default SystemMessage;
