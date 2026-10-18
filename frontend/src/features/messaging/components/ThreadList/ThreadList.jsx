import React from 'react';
import {
  Box, Flex, Text, Button, Spinner, Icon, Input, InputGroup, InputLeftElement, Select, HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiInbox, FiSearch } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ThreadListItem from './ThreadListItem';
import { useThreads } from '../../hooks/useMessaging';

const STATUSES = ['new', 'open', 'waiting_requester', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const TEAMS = ['support', 'billing', 'technical', 'clinical'];

/**
 * Infinite-scrolling thread list for a box, with search + (staff) filters.
 */
const ThreadList = ({
  params,              // { box, team?, ... } from the portal config
  filters,             // { q, status, priority, team, assignee }
  onFiltersChange,
  showFilters = false,
  isStaff = true,
  activeId = null,
  onSelect,
  isQueue = false,
}) => {
  const { t } = useTranslation('messaging');
  const border = useColorModeValue('gray.100', 'gray.700');
  const query = { ...params, ...Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v)) };
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useThreads(query);

  const items = data?.pages?.flatMap((p) => p.items) || [];
  const set = (k) => (e) => onFiltersChange?.({ ...filters, [k]: e.target.value });

  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box p={2} borderBottomWidth="1px" borderColor={border} flexShrink={0}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none"><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
          <Input
            placeholder={t('list.search')}
            value={filters?.q || ''}
            onChange={set('q')}
            borderRadius="md"
            aria-label={t('list.search')}
          />
        </InputGroup>
        {showFilters && (
          <HStack spacing={1} mt={2}>
            <Select size="xs" value={filters?.status || ''} onChange={set('status')} aria-label={t('list.allStatuses')}>
              <option value="">{t('list.allStatuses')}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </Select>
            <Select size="xs" value={filters?.priority || ''} onChange={set('priority')} aria-label={t('list.allPriorities')}>
              <option value="">{t('list.allPriorities')}</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
            </Select>
            {!params.team && params.box !== 'direct' && (
              <Select size="xs" value={filters?.team || ''} onChange={set('team')} aria-label={t('list.allTeams')}>
                <option value="">{t('list.allTeams')}</option>
                {TEAMS.map((tm) => <option key={tm} value={tm}>{t(`team.${tm}`)}</option>)}
              </Select>
            )}
          </HStack>
        )}
      </Box>

      <Box flex={1} minH={0} overflowY="auto" role="list" aria-busy={isLoading}>
        {isLoading ? (
          <Flex justify="center" py={10}><Spinner size="sm" color="teal.500" /></Flex>
        ) : isError ? (
          <Text p={4} fontSize="sm" color="red.400">{t('toast.error')}</Text>
        ) : items.length === 0 ? (
          <Flex direction="column" align="center" py={12} px={4} color="gray.400">
            <Icon as={FiInbox} boxSize={8} opacity={0.4} />
            <Text mt={2} fontSize="sm" textAlign="center">{isQueue ? t('list.emptyQueue') : t('list.emptyInbox')}</Text>
          </Flex>
        ) : (
          <>
            {items.map((thread) => (
              <ThreadListItem
                key={thread._id}
                thread={thread}
                active={String(thread._id) === String(activeId)}
                isStaff={isStaff}
                onClick={onSelect}
              />
            ))}
            {hasNextPage && (
              <Flex justify="center" py={3}>
                <Button size="xs" variant="ghost" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
                  {t('list.loadMore')}
                </Button>
              </Flex>
            )}
          </>
        )}
      </Box>
    </Flex>
  );
};

export default ThreadList;
