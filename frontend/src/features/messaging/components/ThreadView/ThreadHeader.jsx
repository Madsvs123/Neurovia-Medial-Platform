import React from 'react';
import {
  Box, Flex, HStack, Heading, Text, Button, IconButton, Menu, MenuButton, MenuList, MenuItem,
  MenuDivider, useColorModeValue, Tooltip,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiCheckCircle, FiRotateCcw, FiUserCheck, FiUserPlus, FiCornerUpRight, FiArchive,
  FiTrash2, FiMoreVertical, FiClock, FiXCircle, FiAlertTriangle, FiFlag,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge, PriorityBadge, KindBadge, TeamBadge } from '../shared/Badges';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/**
 * Title row + the action bar. Every button is driven by
 * `thread.capabilities` (computed server-side by threadPolicy), so the UI
 * can never offer something the API would refuse.
 */
const ThreadHeader = ({ thread, isStaff, isAdmin = false, onBack, onAction, compact = false }) => {
  const { t } = useTranslation('messaging');
  const border = useColorModeValue('gray.200', 'gray.700');
  const caps = thread.capabilities || {};
  const transitions = caps.transitions || [];
  const isRequester = thread.me?.role === 'requester';
  const has = (s) => transitions.includes(s);

  return (
    <Box px={compact ? 3 : 4} py={compact ? 2 : 3} borderBottomWidth="1px" borderColor={border}>
      <Flex align="center" gap={2}>
        {onBack && (
          <IconButton icon={<FiArrowLeft />} aria-label={t('nav.back')} size="sm" variant="ghost" onClick={onBack} />
        )}
        <Box flex={1} minW={0}>
          <Heading size={compact ? 'sm' : 'md'} noOfLines={1}>{thread.subject}</Heading>
          <HStack spacing={1.5} mt={1} flexWrap="wrap">
            <StatusBadge status={thread.status} isStaff={isStaff} isRequester={isRequester} />
            <PriorityBadge priority={thread.priority} />
            {isStaff && <KindBadge kind={thread.kind} />}
            {isStaff && thread.kind !== 'direct' && <TeamBadge team={thread.team} />}
            {thread.slaBreachedAt && !thread.firstResponseAt && (
              <Tooltip label={t('thread.slaBreached')}><Box color="red.400" display="inline-flex"><FiAlertTriangle size={14} /></Box></Tooltip>
            )}
            {!compact && (
              <Text fontSize="xs" color="gray.500">· {thread.messageCount} {t('thread.messages')}</Text>
            )}
          </HStack>
        </Box>

        <HStack spacing={1} flexShrink={0}>
          {caps.claim && (
            <Button size="sm" colorScheme="teal" leftIcon={<FiUserCheck />} onClick={() => onAction('claim')}>{t('actions.claim')}</Button>
          )}
          {!caps.claim && caps.join && (
            <Button size="sm" variant="outline" leftIcon={<FiUserPlus />} onClick={() => onAction('join')}>{t('actions.join')}</Button>
          )}
          {has('resolved') && (
            <Button size="sm" colorScheme="green" leftIcon={<FiCheckCircle />} onClick={() => onAction('status', 'resolved')}>
              {isRequester && !isStaff ? t('actions.solvedByMe') : t('actions.resolve')}
            </Button>
          )}
          {has('open') && (thread.status === 'resolved' || thread.status === 'closed') && (
            <Button size="sm" colorScheme="orange" variant="outline" leftIcon={<FiRotateCcw />} onClick={() => onAction('status', 'open')}>{t('actions.reopen')}</Button>
          )}

          <Menu placement="bottom-end" isLazy>
            <MenuButton as={IconButton} icon={<FiMoreVertical />} size="sm" variant="ghost" aria-label={t('actions.moreActions')} />
            <MenuList fontSize="sm">
              {has('waiting_requester') && <MenuItem icon={<FiClock />} onClick={() => onAction('status', 'waiting_requester')}>{t('actions.waiting')}</MenuItem>}
              {has('open') && thread.status === 'waiting_requester' && <MenuItem icon={<FiRotateCcw />} onClick={() => onAction('status', 'open')}>{t('actions.markOpen')}</MenuItem>}
              {has('closed') && <MenuItem icon={<FiXCircle />} onClick={() => onAction('status', 'closed')}>{t('actions.close')}</MenuItem>}
              {caps.assign && <MenuItem icon={<FiUserPlus />} onClick={() => onAction('assign')}>{thread.assignee ? t('actions.reassign') : t('actions.assign')}</MenuItem>}
              {caps.unassign && thread.assignee && <MenuItem icon={<FiUserCheck />} onClick={() => onAction('unassign')}>{t('actions.unassign')}</MenuItem>}
              {caps.escalate && <MenuItem icon={<FiCornerUpRight />} onClick={() => onAction('escalate')}>{t('actions.escalate')}</MenuItem>}
              {caps.setPriority && (
                <>
                  <MenuDivider />
                  {PRIORITIES.filter((p) => p !== thread.priority).map((p) => (
                    <MenuItem key={p} icon={<FiFlag />} onClick={() => onAction('priority', p)}>{t('actions.priority')}: {t(`priority.${p}`)}</MenuItem>
                  ))}
                </>
              )}
              {(caps.archive || caps.delete) && <MenuDivider />}
              {caps.archive && (
                thread.me?.archivedAt
                  ? <MenuItem icon={<FiArchive />} onClick={() => onAction('unarchive')}>{t('actions.unarchive')}</MenuItem>
                  : <MenuItem icon={<FiArchive />} onClick={() => onAction('archive')}>{t('actions.archive')}</MenuItem>
              )}
              {caps.delete && <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => onAction('delete')}>{t('actions.delete')}</MenuItem>}
              {isAdmin && (
                <MenuItem icon={<FiTrash2 />} color="red.600" onClick={() => onAction('hardDelete')}>{t('actions.hardDelete')}</MenuItem>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default ThreadHeader;
