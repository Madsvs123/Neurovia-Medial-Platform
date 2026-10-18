import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Badge, Button, Spinner, Text, IconButton } from '@chakra-ui/react';
import { FiChevronDown } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';
import { idOf } from '../../model/meta';

dayjs.extend(calendar);

const dayLabel = (date) => dayjs(date).calendar(null, {
  sameDay: '[Today]', lastDay: '[Yesterday]', lastWeek: 'dddd', sameElse: 'MMMM D, YYYY',
});

/**
 * The message thread. Renders oldest→newest, groups consecutive messages
 * from the same sender, inserts day dividers and system entries, keeps the
 * view pinned to the bottom unless the user scrolled up, and exposes a
 * "load older" control at the top (cursor pagination).
 */
const MessageTimeline = ({
  messages = [],
  currentUserId,
  thread,
  loading = false,
  hasOlder = false,
  loadingOlder = false,
  onLoadOlder,
  canModerate = false,
  onEdit,
  onDelete,
  typing = null,
}) => {
  const { t } = useTranslation('messaging');
  const containerRef = useRef(null);
  const endRef = useRef(null);
  const [pinned, setPinned] = useState(true);
  const prevCount = useRef(messages.length);

  // Who has read up to which message (from participants' lastReadAt)
  const readers = useMemo(() => (thread?.participants || [])
    .filter((p) => String(idOf(p.user)) !== String(currentUserId) && p.lastReadAt)
    .map((p) => ({ user: p.user, at: new Date(p.lastReadAt).getTime() })), [thread, currentUserId]);

  const lastOwnIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].kind !== 'system' && String(idOf(messages[i].sender)) === String(currentUserId)) return i;
    }
    return -1;
  }, [messages, currentUserId]);

  const rows = useMemo(() => messages.map((m, i) => {
    const prev = i > 0 ? messages[i - 1] : null;
    const isSystem = m.kind === 'system';
    const own = !isSystem && String(idOf(m.sender)) === String(currentUserId);
    const sameSender = prev && prev.kind !== 'system' && !isSystem && String(idOf(prev.sender)) === String(idOf(m.sender)) && prev.kind === m.kind;
    const closeInTime = prev && (new Date(m.createdAt) - new Date(prev.createdAt)) < 5 * 60 * 1000;
    const showHeader = !sameSender || !closeInTime;
    const newDay = !prev || dayjs(m.createdAt).format('YYYY-MM-DD') !== dayjs(prev.createdAt).format('YYYY-MM-DD');
    const seenBy = i === lastOwnIndex
      ? readers.filter((r) => r.at >= new Date(m.createdAt).getTime()).map((r) => r.user)
      : [];
    return { m, own, showHeader, newDay, seenBy };
  }), [messages, currentUserId, readers, lastOwnIndex]);

  const scrollToBottom = (smooth) => {
    endRef.current?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    setPinned(true);
  };

  // Pin to bottom on first load and when new messages arrive while pinned
  useEffect(() => {
    if (messages.length !== prevCount.current) {
      const grew = messages.length > prevCount.current;
      prevCount.current = messages.length;
      if (pinned && grew) scrollToBottom(false);
    } else if (pinned) {
      scrollToBottom(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, thread?._id]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < 80);
  };

  return (
    <Box position="relative" h="100%" minH={0}>
      <Box
        ref={containerRef}
        onScroll={onScroll}
        h="100%"
        overflowY="auto"
        px={{ base: 3, md: 5 }}
        py={4}
        aria-live="polite"
        aria-relevant="additions"
        sx={{ '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { bg: 'gray.300', borderRadius: 'full' } }}
      >
        {hasOlder && (
          <Flex justify="center" mb={3}>
            <Button size="xs" variant="outline" onClick={onLoadOlder} isLoading={loadingOlder}>{t('thread.loadOlder')}</Button>
          </Flex>
        )}

        {loading ? (
          <Flex justify="center" py={10}><Spinner color="teal.500" /></Flex>
        ) : rows.map(({ m, own, showHeader, newDay, seenBy }) => (
          <Box key={m._id}>
            {newDay && (
              <Flex justify="center" my={3}>
                <Badge variant="subtle" colorScheme="gray" borderRadius="full" px={3} py={1} fontSize="10px" textTransform="uppercase">
                  {dayLabel(m.createdAt)}
                </Badge>
              </Flex>
            )}
            {m.kind === 'system'
              ? <SystemMessage message={m} />
              : (
                <MessageBubble
                  message={m}
                  isOwn={own}
                  showHeader={showHeader}
                  canModerate={canModerate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  seenBy={seenBy}
                />
              )}
          </Box>
        ))}

        {typing && (
          <Text fontSize="xs" color="gray.400" fontStyle="italic" mt={1} aria-live="polite">
            {t('thread.typing', { name: typing.username })}
          </Text>
        )}
        <Box ref={endRef} />
      </Box>

      {!pinned && (
        <IconButton
          icon={<FiChevronDown />}
          aria-label="Scroll to latest"
          size="sm"
          isRound
          colorScheme="teal"
          position="absolute"
          bottom={3}
          right={4}
          boxShadow="lg"
          onClick={() => scrollToBottom(true)}
        />
      )}
    </Box>
  );
};

export default MessageTimeline;
