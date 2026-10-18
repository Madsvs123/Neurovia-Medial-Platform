import React from 'react';
import { Box, Flex, HStack, Text, Badge, useColorModeValue, Icon } from '@chakra-ui/react';
import { FiAlertTriangle, FiCornerUpRight, FiLock } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge, PriorityBadge, TeamBadge, UserAvatar, RelativeTime } from '../shared/Badges';
import { displayName, isDone } from '../../model/meta';

/**
 * One row in the thread list. Shows the counterpart (who you're talking
 * to), subject, last message preview, status/priority/team chips, unread
 * count and SLA breach marker. Keyboard-accessible (role=button).
 */
const ThreadListItem = ({ thread, active = false, isStaff = true, onClick }) => {
  const { t } = useTranslation('messaging');
  const bg = useColorModeValue(active ? 'teal.50' : 'white', active ? 'teal.900' : 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const border = useColorModeValue('gray.100', 'gray.700');

  const unread = thread.unreadCount || 0;
  const done = isDone(thread.status);
  const who = thread.counterpart;
  const whoName = who ? displayName(who) : (thread.team ? t(`team.${thread.team}`) : t('thread.unassigned'));
  const isRequester = thread.me?.role === 'requester';

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
      onClick={() => onClick?.(thread)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(thread); } }}
      px={3}
      py={3}
      bg={bg}
      borderBottomWidth="1px"
      borderColor={border}
      borderLeftWidth="3px"
      borderLeftColor={active ? 'teal.400' : 'transparent'}
      cursor="pointer"
      _hover={{ bg: active ? bg : hoverBg }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'teal.400', outlineOffset: '-2px' }}
      opacity={done && !active ? 0.7 : 1}
      transition="background 0.12s"
    >
      <Flex gap={3} align="flex-start">
        <UserAvatar user={who} size="sm" mt={0.5} />
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" fontWeight={unread ? 'bold' : 'semibold'} noOfLines={1} flex={1} minW={0}>
              {thread.subject}
            </Text>
            <RelativeTime date={thread.lastActivityAt} flexShrink={0} />
          </Flex>

          <Text fontSize="xs" color="gray.500" noOfLines={1} mt={0.5}>
            <Text as="span" fontWeight="medium" color="gray.600">{whoName}</Text>
            {thread.lastMessage?.text ? ` · ${thread.lastMessage.text}` : ''}
          </Text>

          <HStack spacing={1.5} mt={1.5} flexWrap="wrap">
            <StatusBadge status={thread.status} isStaff={isStaff} isRequester={isRequester} fontSize="10px" />
            <PriorityBadge priority={thread.priority} fontSize="10px" />
            {isStaff && thread.kind !== 'direct' && <TeamBadge team={thread.team} fontSize="10px" />}
            {thread.kind === 'internal' && <Icon as={FiLock} boxSize={3} color="purple.400" aria-label={t('kind.internal')} />}
            {thread.parentThread && <Icon as={FiCornerUpRight} boxSize={3} color="gray.400" aria-label={t('list.escalated')} />}
            {thread.slaBreachedAt && !thread.firstResponseAt && (
              <Icon as={FiAlertTriangle} boxSize={3} color="red.400" aria-label={t('thread.slaBreached')} />
            )}
            {unread > 0 && (
              <Badge colorScheme="teal" borderRadius="full" fontSize="10px" px={1.5} ml="auto">{unread > 99 ? '99+' : unread}</Badge>
            )}
          </HStack>
        </Box>
      </Flex>
    </Box>
  );
};

export default ThreadListItem;
