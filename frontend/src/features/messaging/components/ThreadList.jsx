import React, { useState, useMemo } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Input, InputGroup, InputLeftElement, Select, Button, Icon,
  Spinner, useColorModeValue, Tabs, TabList, Tab, Badge, IconButton, Tooltip, Checkbox,
} from '@chakra-ui/react';
import { FiSearch, FiInbox, FiMessageSquare, FiAlertTriangle, FiPlus, FiFilter, FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useThreads, useThreadCounts } from '../hooks';
import { StatusBadge, KindBadge, PriorityBadge, UserAvatar, UnreadDot, TeamBadge } from './atoms';
import { displayName, listTime, sameId, slaInfo, isStaffRole } from '../model/meta';

/**
 * Left pane: box tabs → search/filters → virtual-ish list (paged with
 * "load more"; lists are short-lived per box so windowing isn't needed).
 */
export const ThreadListItem = ({ thread, active, onClick, currentUser, sla, selectable, selected, onSelect }) => {
  const { t } = useTranslation();
  const activeBg = useColorModeValue('teal.50', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const border = useColorModeValue('gray.100', 'gray.700');
  const myId = currentUser?._id || currentUser?.id;
  const isRequester = sameId(thread.requester, myId);
  const other = thread.counterpart;
  const unread = thread.unreadCount || 0;
  const slaState = isStaffRole(currentUser?.role) ? slaInfo(thread, sla) : null;

  return (
    <Flex
      role="button"
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
      onClick={() => onClick(thread)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(thread); } }}
      px={3} py={3} gap={3} align="flex-start" cursor="pointer"
      bg={active ? activeBg : 'transparent'}
      borderLeftWidth="3px" borderLeftColor={active ? 'teal.500' : 'transparent'}
      borderBottomWidth="1px" borderBottomColor={border}
      _hover={{ bg: active ? activeBg : hoverBg }}
      _focusVisible={{ outline: '2px solid', outlineColor: 'teal.400', outlineOffset: '-2px' }}
      transition="background 0.12s"
    >
      {selectable && (
        <Checkbox isChecked={!!selected} onChange={(e) => { e.stopPropagation(); onSelect(thread, e.target.checked); }} onClick={(e) => e.stopPropagation()} mt={1} />
      )}
      <UserAvatar user={other || thread.requester} size="sm" mt={0.5} />
      <Box flex={1} minW={0}>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" fontWeight={unread ? 'bold' : 'semibold'} noOfLines={1} flex={1} minW={0}>
            {thread.subject || t('labels.noSubject')}
          </Text>
          <Text fontSize="xs" color="gray.500" flexShrink={0}>{listTime(thread.lastMessage?.at || thread.updatedAt)}</Text>
        </Flex>
        <Text fontSize="xs" color="gray.500" noOfLines={1} mt={0.5}>
          {other ? displayName(other) : (thread.kind === 'support' ? t(`team.${thread.team || 'support'}`) : '')}
          {thread.lastMessage?.text ? ` · ${thread.lastMessage.text}` : ''}
        </Text>
        <HStack spacing={1.5} mt={1.5} flexWrap="wrap">
          {thread.kind !== 'direct' && <StatusBadge status={thread.status} asRequester={isRequester && !isStaffRole(currentUser?.role)} />}
          <KindBadge kind={thread.kind} />
          <PriorityBadge priority={thread.priority} />
          {isStaffRole(currentUser?.role) && thread.kind !== 'direct' && <TeamBadge team={thread.team} />}
          {slaState?.state === 'breached' && (
            <Tooltip label={t('labels.slaBreached')} hasArrow><Box as="span" color="red.500" display="inline-flex"><Icon as={FiAlertTriangle} /></Box></Tooltip>
          )}
          {thread.kind !== 'direct' && isStaffRole(currentUser?.role) && !thread.assignee && (
            <Badge variant="outline" colorScheme="orange" fontSize="2xs" textTransform="none" borderRadius="md">{t('labels.unassigned')}</Badge>
          )}
        </HStack>
      </Box>
      <UnreadDot count={unread} />
    </Flex>
  );
};

const EmptyState = ({ box, searching }) => {
  const { t } = useTranslation();
  const key = searching ? 'search' : (['queue', 'assigned', 'archived'].includes(box) ? box : 'inbox');
  return (
    <VStack py={12} spacing={2} color="gray.500">
      <Icon as={box === 'queue' ? FiInbox : FiMessageSquare} boxSize={10} opacity={0.25} />
      <Text fontSize="sm">{t(`empty.${key}`)}</Text>
    </VStack>
  );
};

const ThreadList = ({
  boxes, box, onBoxChange, activeId, onOpen, onNew, currentUser, config, filtersEnabled = true,
  selectable = false, selectedIds = new Set(), onSelect, bulkActions = null,
}) => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', kind: '', team: '', priority: '', category: '' });
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const bulkBg = useColorModeValue('teal.50', 'whiteAlpha.100');

  const params = useMemo(() => {
    const p = { box, limit: 30 };
    if (q.trim()) p.q = q.trim();
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [box, q, filters]);

  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useThreads(params);
  const { data: counts } = useThreadCounts();
  const boxIndex = Math.max(0, boxes.findIndex((b) => b.key === box));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Flex direction="column" h="100%" minH={0} bg={bg} borderRightWidth={{ base: 0, md: '1px' }} borderColor={border}>
      <Box px={3} pt={3} pb={2} borderBottomWidth="1px" borderColor={border}>
        <Flex align="center" gap={2} mb={2}>
          <InputGroup size="sm" flex={1}>
            <InputLeftElement pointerEvents="none"><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
            <Input placeholder={t('actions.search')} value={q} onChange={(e) => setQ(e.target.value)} borderRadius="lg" aria-label={t('actions.search')} />
          </InputGroup>
          {filtersEnabled && (
            <Tooltip label={t('actions.filters')} hasArrow>
              <IconButton size="sm" variant={showFilters || activeFilterCount ? 'solid' : 'ghost'} colorScheme={activeFilterCount ? 'teal' : 'gray'} icon={<FiFilter />} aria-label={t('actions.filters')} onClick={() => setShowFilters((v) => !v)} />
            </Tooltip>
          )}
          {onNew && (
            <Tooltip label={t('nav.newMessage')} hasArrow>
              <IconButton size="sm" colorScheme="teal" icon={<FiPlus />} aria-label={t('nav.newMessage')} onClick={onNew} />
            </Tooltip>
          )}
        </Flex>
        {showFilters && filtersEnabled && (
          <HStack spacing={2} mb={2} flexWrap="wrap">
            <Select size="xs" w="auto" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} aria-label={t('labels.status')}>
              <option value="">{t('labels.status')}</option>
              {Object.keys(config?.statuses || {}).map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </Select>
            <Select size="xs" w="auto" value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value }))} aria-label={t('labels.kind')}>
              <option value="">{t('labels.kind')}</option>
              {Object.keys(config?.kinds || {}).map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
            </Select>
            <Select size="xs" w="auto" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} aria-label={t('labels.priority')}>
              <option value="">{t('labels.priority')}</option>
              {(config?.priorities || []).map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
            </Select>
            {isStaffRole(currentUser?.role) && (
              <Select size="xs" w="auto" value={filters.team} onChange={(e) => setFilters((f) => ({ ...f, team: e.target.value }))} aria-label={t('labels.team')}>
                <option value="">{t('labels.team')}</option>
                {(config?.teams || []).map((tm) => <option key={tm} value={tm}>{t(`team.${tm}`)}</option>)}
              </Select>
            )}
            {activeFilterCount > 0 && (
              <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={() => setFilters({ status: '', kind: '', team: '', priority: '', category: '' })}>{t('actions.cancel')}</Button>
            )}
          </HStack>
        )}
        <Tabs index={boxIndex} onChange={(i) => onBoxChange(boxes[i].key)} variant="soft-rounded" colorScheme="teal" size="sm">
          <TabList flexWrap="wrap" gap={1}>
            {boxes.map((b) => {
              const count = b.countKey ? counts?.[b.countKey] : null;
              return (
                <Tab key={b.key} fontSize="xs" px={3} py={1}>
                  {t(b.labelKey)}
                  {count > 0 && <Badge ml={1.5} borderRadius="full" fontSize="2xs" colorScheme={b.key === 'queue' ? 'orange' : 'teal'}>{count}</Badge>}
                </Tab>
              );
            })}
          </TabList>
        </Tabs>
      </Box>

      {bulkActions && selectable && selectedIds.size > 0 && (
        <Flex px={3} py={2} gap={2} align="center" bg={bulkBg} borderBottomWidth="1px" borderColor={border}>
          <Text fontSize="xs" fontWeight="semibold">{selectedIds.size} selected</Text>
          {bulkActions}
        </Flex>
      )}

      <Box flex={1} minH={0} overflowY="auto" role="list" aria-label={t(boxes[boxIndex]?.labelKey || 'boxes.inbox')}>
        {isLoading ? (
          <Flex justify="center" py={10}><Spinner size="sm" color="teal.500" /></Flex>
        ) : items.length === 0 ? (
          <EmptyState box={box} searching={!!q || activeFilterCount > 0} />
        ) : (
          <>
            {items.map((thread) => (
              <ThreadListItem
                key={thread._id}
                thread={thread}
                active={activeId === thread._id}
                onClick={onOpen}
                currentUser={currentUser}
                sla={config?.sla}
                selectable={selectable}
                selected={selectedIds.has(thread._id)}
                onSelect={onSelect}
              />
            ))}
            {hasNextPage && (
              <Flex justify="center" py={3}>
                <Button size="xs" variant="ghost" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>Load more</Button>
              </Flex>
            )}
          </>
        )}
      </Box>
    </Flex>
  );
};

export default ThreadList;
