import React from 'react';
import {
  Box, VStack, HStack, Text, Divider, Button, Icon, Flex, Select, Link as CLink, Tooltip, useColorModeValue, Badge,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiMail, FiBook, FiClock, FiCheckCircle, FiAlertTriangle, FiUserPlus, FiArrowUpRight, FiLink, FiExternalLink } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { StatusBadge, KindBadge, TeamBadge, UserChip, RoleBadge, CategoryBadge } from './atoms';
import { dateLong, fromNow, displayName, slaInfo, isStaffRole } from '../model/meta';

const Card = ({ title, children, action }) => {
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  return (
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="lg" p={3}>
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="gray.500">{title}</Text>
        {action}
      </Flex>
      {children}
    </Box>
  );
};

const Row = ({ label, children }) => (
  <Flex justify="space-between" align="center" fontSize="sm" gap={2}>
    <Text color="gray.500" flexShrink={0}>{label}</Text>
    <Box minW={0} textAlign="right">{children}</Box>
  </Flex>
);

/**
 * Right pane. Cards are chosen by the portal config (`sidebarCards`):
 *  requester | context | assignment | details | participants | linked | timeline
 */
const ThreadSidebar = ({ thread, currentUser, config, cards, actions, onAssign, onEscalate, onAddParticipant, profileLinkFor }) => {
  const { t } = useTranslation();
  const caps = thread.capabilities || {};
  const isStaff = isStaffRole(currentUser?.role);
  const sla = slaInfo(thread, config?.sla);
  const requester = thread.requester;
  const context = thread.context || {};
  const hasContext = context.programId || context.courseId || context.lessonId || context.clinicalCaseId;

  const render = (card) => {
    switch (card) {
      case 'requester':
        return (
          <Card key={card} title={t('labels.requester')} action={profileLinkFor && requester?._id && isStaff ? (
            <Tooltip label={t('actions.viewProfile')} hasArrow><CLink as={RouterLink} to={profileLinkFor(requester)} fontSize="xs" color="teal.500"><Icon as={FiExternalLink} /></CLink></Tooltip>
          ) : null}>
            <VStack align="stretch" spacing={2}>
              <UserChip user={requester} size="sm" />
              {requester?.email && <HStack spacing={1.5} fontSize="xs" color="gray.500"><Icon as={FiMail} /><Text noOfLines={1}>{requester.email}</Text></HStack>}
              {requester?.status && requester.status !== 'active' && <Badge colorScheme="red" fontSize="2xs" alignSelf="flex-start">{requester.status}</Badge>}
            </VStack>
          </Card>
        );
      case 'context':
        if (!hasContext) return null;
        return (
          <Card key={card} title={t('labels.context')}>
            <VStack align="stretch" spacing={1.5} fontSize="sm">
              {context.programId && <HStack spacing={1.5}><Icon as={FiBook} color="gray.400" /><Text noOfLines={1}>{context.programId.title || t('labels.program')}{context.programId.code ? ` · ${context.programId.code}` : ''}</Text></HStack>}
              {context.courseId && <HStack spacing={1.5}><Icon as={FiBook} color="gray.400" /><Text noOfLines={1}>{context.courseId.title || t('labels.course')}</Text></HStack>}
              {context.lessonId && <HStack spacing={1.5}><Icon as={FiBook} color="gray.400" /><Text noOfLines={1}>{context.lessonId.title || t('labels.lesson')}</Text></HStack>}
            </VStack>
          </Card>
        );
      case 'assignment':
        if (thread.kind === 'direct') return null;
        return (
          <Card key={card} title={t('labels.assignee')} action={caps.assign ? (
            <Button size="xs" variant="ghost" colorScheme="teal" onClick={onAssign}>{thread.assignee ? t('actions.reassign') : t('actions.assign')}</Button>
          ) : null}>
            <VStack align="stretch" spacing={2}>
              {thread.assignee ? <UserChip user={thread.assignee} size="sm" /> : <Text fontSize="sm" color="orange.500">{t('labels.unassigned')}</Text>}
              <Row label={t('labels.team')}><TeamBadge team={thread.team} /></Row>
              {caps.claim && <Button size="sm" colorScheme="teal" onClick={actions.claim}>{t('actions.claim')}</Button>}
              {caps.escalate && <Button size="sm" variant="outline" colorScheme="purple" leftIcon={<FiArrowUpRight />} onClick={onEscalate}>{t('actions.escalate')}</Button>}
            </VStack>
          </Card>
        );
      case 'details':
        return (
          <Card key={card} title={t('labels.details')}>
            <VStack align="stretch" spacing={1.5}>
              <Row label={t('labels.kind')}><KindBadge kind={thread.kind} /></Row>
              {thread.kind !== 'direct' && <Row label={t('labels.status')}><StatusBadge status={thread.status} asRequester={!isStaff} /></Row>}
              <Row label={t('labels.category')}>
                {isStaff && caps.isMember ? (
                  <Select size="xs" value={thread.category} onChange={(e) => actions.setCategory(e.target.value)} w="auto" aria-label={t('labels.category')}>
                    {(config?.categories || []).map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                  </Select>
                ) : <CategoryBadge category={thread.category} />}
              </Row>
              {thread.kind !== 'direct' && (
                <Row label={t('labels.priority')}>
                  {isStaff && caps.isMember ? (
                    <Select size="xs" value={thread.priority} onChange={(e) => actions.setPriority(e.target.value)} w="auto" aria-label={t('labels.priority')}>
                      {(config?.priorities || []).map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                    </Select>
                  ) : <Text fontSize="sm">{t(`priority.${thread.priority}`)}</Text>}
                </Row>
              )}
              {sla && isStaff && (
                <Row label={t('labels.sla')}>
                  {sla.state === 'met' && <HStack spacing={1} color="green.500" fontSize="xs"><Icon as={FiCheckCircle} /><Text>{t('labels.slaMet', { time: `${sla.tookHours}h` })}</Text></HStack>}
                  {sla.state === 'pending' && <HStack spacing={1} color="gray.500" fontSize="xs"><Icon as={FiClock} /><Text>{t('labels.slaDue', { time: fromNow(sla.dueAt) })}</Text></HStack>}
                  {sla.state === 'breached' && <HStack spacing={1} color="red.500" fontSize="xs"><Icon as={FiAlertTriangle} /><Text>{t('labels.slaBreached')}</Text></HStack>}
                </Row>
              )}
            </VStack>
          </Card>
        );
      case 'participants':
        return (
          <Card key={card} title={t('labels.participants')} action={caps.addParticipant ? (
            <Tooltip label={t('actions.addParticipant')} hasArrow><Button size="xs" variant="ghost" onClick={onAddParticipant} leftIcon={<FiUserPlus />}>{t('actions.addParticipant')}</Button></Tooltip>
          ) : null}>
            <VStack align="stretch" spacing={1.5}>
              {(thread.participants || []).filter((p) => !p.deletedAt).map((p) => (
                <HStack key={p.user?._id || p.user} justify="space-between">
                  <UserChip user={p.user} showRole={false} />
                  <HStack spacing={1}><RoleBadge role={p.user?.role} /><Badge fontSize="2xs" variant="outline" textTransform="none">{p.role}</Badge></HStack>
                </HStack>
              ))}
            </VStack>
          </Card>
        );
      case 'linked': {
        const links = [thread.parentThread, ...(thread.childThreads || [])].filter(Boolean);
        if (!links.length) return null;
        return (
          <Card key={card} title={t('labels.linked')}>
            <VStack align="stretch" spacing={1.5}>
              {thread.parentThread && (
                <CLink as={RouterLink} to={actions.linkTo(thread.parentThread._id)} fontSize="sm" display="flex" alignItems="center" gap={1}>
                  <Icon as={FiLink} /><Text noOfLines={1}>{t('labels.escalatedFrom')}: {thread.parentThread.subject}</Text>
                </CLink>
              )}
              {(thread.childThreads || []).map((c) => (
                <CLink key={c._id} as={RouterLink} to={actions.linkTo(c._id)} fontSize="sm" display="flex" alignItems="center" gap={1}>
                  <Icon as={FiArrowUpRight} /><Text noOfLines={1}>{c.subject}</Text><StatusBadge status={c.status} />
                </CLink>
              ))}
            </VStack>
          </Card>
        );
      }
      case 'timeline':
        return (
          <Card key={card} title={t('labels.timeline')}>
            <VStack align="stretch" spacing={1} fontSize="xs" color="gray.500">
              <Row label={t('labels.created')}><Text>{dateLong(thread.createdAt)}</Text></Row>
              {thread.firstResponseAt && <Row label={t('labels.firstResponse')}><Text>{dateLong(thread.firstResponseAt)}</Text></Row>}
              <Row label={t('labels.lastActivity')}><Text>{fromNow(thread.lastMessage?.at || thread.updatedAt)}</Text></Row>
              {thread.resolvedAt && <Row label={t('labels.resolvedAt')}><Text>{dateLong(thread.resolvedAt)}</Text></Row>}
              {thread.closedAt && <Row label={t('labels.closedAt')}><Text>{dateLong(thread.closedAt)}</Text></Row>}
            </VStack>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <VStack align="stretch" spacing={3}>
      {cards.map(render)}
      <Divider display="none" />
      <Text fontSize="2xs" color="gray.400" textAlign="center">{displayName(currentUser)} · {t(`labels.role.${currentUser?.role}`)}</Text>
    </VStack>
  );
};

export default ThreadSidebar;
