import React from 'react';
import {
  Box, VStack, HStack, Text, Divider, Button, IconButton, Link as ChakraLink, Tooltip, Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiMail, FiExternalLink, FiUserPlus, FiX, FiCornerUpRight, FiBook, FiLayers, FiAlertTriangle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import dayjs from 'dayjs';
import { UserAvatar, RoleBadge, StatusBadge, TeamBadge, RelativeTime } from '../shared/Badges';
import { displayName, idOf, slaDueAt } from '../../model/meta';
import { useMessagingConfig } from '../../hooks/useMessaging';

const Card = ({ title, action, children }) => {
  const border = useColorModeValue('gray.100', 'gray.700');
  return (
    <Box px={4} py={3} borderBottomWidth="1px" borderColor={border}>
      <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">{title}</Text>
        {action}
      </HStack>
      {children}
    </Box>
  );
};

const Row = ({ label, children }) => (
  <HStack justify="space-between" fontSize="sm" align="flex-start" spacing={3}>
    <Text color="gray.500" flexShrink={0}>{label}</Text>
    <Box textAlign="right" minW={0}>{children}</Box>
  </HStack>
);

const PersonRow = ({ user, subtitle, link }) => (
  <HStack spacing={3} align="center">
    <UserAvatar user={user} size="sm" />
    <Box flex={1} minW={0}>
      <HStack spacing={1}>
        <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{displayName(user)}</Text>
        <RoleBadge role={user?.role} fontSize="9px" />
      </HStack>
      {subtitle && <Text fontSize="xs" color="gray.500" noOfLines={1}>{subtitle}</Text>}
    </Box>
    {link && (
      <Tooltip label={link}><IconButton as={RouterLink} to={link} icon={<FiExternalLink />} size="xs" variant="ghost" aria-label="Open profile" /></Tooltip>
    )}
  </HStack>
);

/**
 * Context sidebar. Which cards render is decided by the portal config
 * (`portal.sidebar`); the thread + action handlers are injected by ThreadView.
 */
const ThreadSidebar = ({ thread, portal, currentUser, onAction, onNavigateToThread }) => {
  const { t } = useTranslation('messaging');
  const { data: config } = useMessagingConfig();
  if (!thread) return null;

  const cards = portal?.sidebar || [];
  const isAdmin = currentUser?.role === 'admin';
  const caps = thread.capabilities || {};
  const due = slaDueAt(thread, config);
  const overdue = due && due.getTime() < Date.now();

  const render = {
    requester: () => thread.kind !== 'direct' && (
      <Card title={t('thread.requester')}>
        <PersonRow
          user={thread.requester}
          subtitle={thread.requester?.email}
          link={isAdmin && thread.requester?._id ? `/admin/users/${thread.requester._id}` : null}
        />
      </Card>
    ),

    context: () => (thread.context?.program || thread.context?.course) && (
      <Card title={t('thread.context')}>
        <VStack align="stretch" spacing={1.5} fontSize="sm">
          {thread.context.program && (
            <HStack><FiLayers size={14} /><Text noOfLines={1}>{thread.context.program.title}</Text>
              {thread.context.program.code && <Badge fontSize="9px">{thread.context.program.code}</Badge>}</HStack>
          )}
          {thread.context.course && <HStack><FiBook size={14} /><Text noOfLines={1}>{thread.context.course.title}</Text></HStack>}
        </VStack>
      </Card>
    ),

    assignment: () => thread.kind !== 'direct' && (
      <Card
        title={t('thread.assignee')}
        action={caps.assign && <Button size="xs" variant="ghost" onClick={() => onAction('assign')}>{thread.assignee ? t('actions.reassign') : t('actions.assign')}</Button>}
      >
        {thread.assignee ? <PersonRow user={thread.assignee} subtitle={thread.assignee.email} /> : (
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.500">{t('thread.unassigned')}</Text>
            {caps.claim && <Button size="xs" colorScheme="teal" onClick={() => onAction('claim')}>{t('actions.claim')}</Button>}
          </HStack>
        )}
        <HStack mt={2} spacing={2}><Text fontSize="xs" color="gray.500">{t('thread.teamLabel')}:</Text><TeamBadge team={thread.team} /></HStack>
      </Card>
    ),

    details: () => (
      <Card title={t('thread.details')}>
        <VStack align="stretch" spacing={1.5}>
          <Row label={t('thread.statusLabel')}><StatusBadge status={thread.status} isStaff={portal?.isStaff} isRequester={thread.me?.role === 'requester'} /></Row>
          {thread.kind !== 'direct' && <Row label={t('thread.categoryLabel')}><Text fontSize="sm">{t(`category.${thread.category}`)}</Text></Row>}
          {thread.kind !== 'direct' && <Row label={t('thread.priorityLabel')}><Text fontSize="sm">{t(`priority.${thread.priority}`)}</Text></Row>}
          <Row label={t('thread.created')}><Text fontSize="sm">{dayjs(thread.createdAt).format('MMM D, YYYY h:mm A')}</Text></Row>
          <Row label={t('thread.lastActivity')}><RelativeTime date={thread.lastActivityAt} fontSize="sm" color="inherit" /></Row>
          {thread.kind !== 'direct' && portal?.isStaff && (
            <Row label={t('thread.firstResponse')}>
              {thread.firstResponseAt
                ? <Text fontSize="sm">{dayjs(thread.firstResponseAt).from(dayjs(thread.createdAt), true)}</Text>
                : due ? (
                  <HStack spacing={1} justify="flex-end" color={overdue ? 'red.500' : 'gray.600'}>
                    {overdue && <FiAlertTriangle size={12} />}
                    <Text fontSize="sm">{overdue ? t('thread.slaBreached') : t('thread.slaDue', { when: dayjs(due).fromNow() })}</Text>
                  </HStack>
                ) : <Text fontSize="sm" color="gray.400">—</Text>}
            </Row>
          )}
          {thread.resolvedAt && <Row label={t('thread.resolvedAt')}><Text fontSize="sm">{dayjs(thread.resolvedAt).format('MMM D, YYYY')}</Text></Row>}
        </VStack>
      </Card>
    ),

    participants: () => (
      <Card
        title={t('thread.participants')}
        action={caps.addParticipant && <IconButton icon={<FiUserPlus />} size="xs" variant="ghost" aria-label={t('actions.addParticipant')} onClick={() => onAction('addParticipant')} />}
      >
        <VStack align="stretch" spacing={2}>
          {(thread.participants || []).map((p) => (
            <HStack key={String(idOf(p.user))} spacing={2}>
              <UserAvatar user={p.user} size="xs" />
              <Box flex={1} minW={0}>
                <Text fontSize="sm" noOfLines={1}>{displayName(p.user)}{String(idOf(p.user)) === String(currentUser?._id || currentUser?.id) ? ` (${t('thread.you')})` : ''}</Text>
                <Text fontSize="10px" color="gray.500" textTransform="capitalize">{p.role}</Text>
              </Box>
              {p.user?.email && <Tooltip label={p.user.email}><ChakraLink href={`mailto:${p.user.email}`} color="gray.400"><FiMail size={13} /></ChakraLink></Tooltip>}
              {caps.removeParticipant && p.role !== 'requester' && (
                <IconButton icon={<FiX />} size="xs" variant="ghost" aria-label={t('actions.remove')} onClick={() => onAction('removeParticipant', idOf(p.user))} />
              )}
            </HStack>
          ))}
        </VStack>
      </Card>
    ),

    linked: () => thread.parentThread && (
      <Card title={t('thread.linked')}>
        <Button
          size="sm" variant="outline" w="100%" justifyContent="flex-start" leftIcon={<FiCornerUpRight />}
          onClick={() => onNavigateToThread(thread.parentThread._id)}
        >
          <Box textAlign="left" minW={0}>
            <Text fontSize="xs" color="gray.500">{t('thread.escalatedFrom')}</Text>
            <Text fontSize="sm" noOfLines={1}>{thread.parentThread.subject}</Text>
          </Box>
        </Button>
      </Card>
    ),
  };

  return (
    <VStack align="stretch" spacing={0}>
      {cards.map((key) => <React.Fragment key={key}>{render[key]?.() || null}</React.Fragment>)}
      <Divider />
    </VStack>
  );
};

export default ThreadSidebar;
