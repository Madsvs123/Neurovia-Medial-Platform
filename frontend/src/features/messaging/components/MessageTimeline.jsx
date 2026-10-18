import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Flex, HStack, Text, Badge, Icon, Button, Spinner, IconButton, Tooltip, useColorModeValue, Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { FiLock, FiInfo, FiChevronDown, FiMoreHorizontal, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import { buildRows, timeShort, displayName } from '../model/meta';
import { RoleBadge, UserAvatar } from './atoms';

const SystemRow = ({ msg }) => {
  const { t } = useTranslation();
  const color = useColorModeValue('gray.500', 'gray.400');
  return (
    <Flex justify="center" my={2} px={4}>
      <HStack spacing={1.5} color={color} fontSize="xs" textAlign="center" maxW="80%">
        <Icon as={FiInfo} boxSize={3} flexShrink={0} />
        <Text>{msg.body}</Text>
        <Text opacity={0.7}>· {timeShort(msg.createdAt)}</Text>
        {msg.meta?.event === 'status' && <Badge fontSize="2xs" textTransform="none">{t(`status.${msg.meta.to}`)}</Badge>}
      </HStack>
    </Flex>
  );
};

const Bubble = ({ row, canEdit, onEdit, onDelete, readByOthers }) => {
  const { t } = useTranslation();
  const { msg, isOwn, showHeader } = row;
  const isNote = msg.kind === 'note';
  const otherBg = useColorModeValue('white', 'gray.700');
  const noteBg = useColorModeValue('yellow.50', 'yellow.900');
  const noteBorder = useColorModeValue('yellow.300', 'yellow.600');
  const otherBorder = useColorModeValue('gray.200', 'gray.600');
  const deleted = !!msg.deletedAt;

  return (
    <Flex justify={isOwn ? 'flex-end' : 'flex-start'} px={4} mt={showHeader ? 3 : 0.5} role="listitem">
      {!isOwn && (
        <Box w="32px" mr={2} flexShrink={0}>
          {showHeader && <UserAvatar user={msg.sender} size="sm" />}
        </Box>
      )}
      <Box maxW="min(78%, 640px)" position="relative" role="group">
        {showHeader && !isOwn && (
          <HStack spacing={1.5} mb={0.5} ml={1}>
            <Text fontSize="xs" fontWeight="bold">{displayName(msg.sender)}</Text>
            <RoleBadge role={msg.sender?.role} />
          </HStack>
        )}
        <Box
          bg={isNote ? noteBg : isOwn ? 'teal.500' : otherBg}
          color={isNote ? undefined : isOwn ? 'white' : undefined}
          borderWidth={isNote || !isOwn ? '1px' : 0}
          borderStyle={isNote ? 'dashed' : 'solid'}
          borderColor={isNote ? noteBorder : otherBorder}
          px={3} py={2}
          borderRadius="xl"
          borderTopLeftRadius={!isOwn && !showHeader ? 'md' : 'xl'}
          borderTopRightRadius={isOwn && !showHeader ? 'md' : 'xl'}
          boxShadow="sm"
          opacity={msg.pending ? 0.6 : 1}
        >
          {isNote && (
            <HStack spacing={1} mb={1} fontSize="2xs" color="yellow.700" _dark={{ color: 'yellow.200' }} textTransform="uppercase" letterSpacing="wide" fontWeight="bold">
              <Icon as={FiLock} boxSize={3} /><Text>{t('actions.note')}</Text>
            </HStack>
          )}
          {deleted ? (
            <Text fontSize="sm" fontStyle="italic" opacity={0.7}>{t('labels.deleted')}</Text>
          ) : (
            <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word" lineHeight="1.5">{msg.body}</Text>
          )}
          <Flex justify="flex-end" align="center" gap={1} mt={0.5}>
            {msg.editedAt && !deleted && <Text fontSize="2xs" opacity={0.7}>{t('labels.edited')}</Text>}
            <Text fontSize="2xs" opacity={0.75}>{timeShort(msg.createdAt)}</Text>
            {isOwn && !isNote && !deleted && (
              <Tooltip label={readByOthers ? 'Read' : 'Sent'} hasArrow>
                <Flex as="span" align="center">
                  <Icon as={FiCheck} boxSize={3} />
                  {readByOthers && <Icon as={FiCheck} boxSize={3} ml="-8px" />}
                </Flex>
              </Tooltip>
            )}
          </Flex>
        </Box>
        {canEdit && isOwn && !deleted && !msg.pending && (
          <Menu placement="bottom-end" isLazy>
            <MenuButton as={IconButton} icon={<FiMoreHorizontal />} size="xs" variant="ghost" position="absolute" top="-6px" left="-28px" opacity={0} _groupHover={{ opacity: 1 }} _focus={{ opacity: 1 }} aria-label="Message actions" />
            <MenuList minW="140px">
              <MenuItem icon={<FiEdit2 />} onClick={() => onEdit(msg)}>{t('actions.edit')}</MenuItem>
              <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => onDelete(msg)}>{t('actions.delete')}</MenuItem>
            </MenuList>
          </Menu>
        )}
      </Box>
    </Flex>
  );
};

const DayDivider = ({ label }) => {
  const bg = useColorModeValue('gray.100', 'gray.700');
  return (
    <Flex justify="center" my={3} px={4}>
      <Badge bg={bg} color="gray.600" _dark={{ color: 'gray.300' }} fontSize="2xs" px={3} py={1} borderRadius="full" textTransform="uppercase">{label}</Badge>
    </Flex>
  );
};

/**
 * Virtualised message list (react-virtuoso) with "load older" at the top,
 * auto-stick-to-bottom, day dividers, grouped bubbles, system rows.
 */
const MessageTimeline = ({
  messages, myId, loading, hasOlder, loadOlder, loadingOlder, canEdit, onEdit, onDelete, readers = [], emptyNode,
}) => {
  const { t } = useTranslation();
  const virtuoso = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const rows = useMemo(() => buildRows(messages, myId, t), [messages, myId, t]);
  const lastId = rows.length ? rows[rows.length - 1].msg._id : null;
  const listBg = useColorModeValue('gray.50', 'gray.900');

  // Last read time among *other* participants → double ticks on my messages
  const othersLastRead = useMemo(() => {
    const times = readers.filter((r) => String(r.userId) !== String(myId) && r.lastReadAt).map((r) => new Date(r.lastReadAt).getTime());
    return times.length ? Math.max(...times) : 0;
  }, [readers, myId]);

  useEffect(() => {
    if (atBottom && lastId && virtuoso.current) {
      virtuoso.current.scrollToIndex({ index: rows.length - 1, align: 'end', behavior: 'auto' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, rows.length]);

  if (loading) return <Flex flex={1} justify="center" align="center"><Spinner color="teal.500" /></Flex>;
  if (!rows.length) return emptyNode || <Flex flex={1} justify="center" align="center" color="gray.500"><Text fontSize="sm">{t('empty.messages')}</Text></Flex>;

  return (
    <Box flex={1} minH={0} position="relative" bg={listBg}>
      <Virtuoso
        ref={virtuoso}
        data={rows}
        initialTopMostItemIndex={rows.length - 1}
        followOutput="auto"
        atBottomStateChange={setAtBottom}
        atBottomThreshold={80}
        increaseViewportBy={{ top: 300, bottom: 300 }}
        role="list"
        aria-live="polite"
        components={{
          Header: () => (hasOlder ? (
            <Flex justify="center" py={2}><Button size="xs" variant="ghost" onClick={loadOlder} isLoading={loadingOlder}>{t('actions.loadOlder')}</Button></Flex>
          ) : <Box h={2} />),
          Footer: () => <Box h={3} />,
        }}
        itemContent={(index, row) => (
          <Box>
            {row.dayDivider && <DayDivider label={row.dayDivider} />}
            {row.msg.kind === 'system'
              ? <SystemRow msg={row.msg} />
              : <Bubble row={row} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} readByOthers={new Date(row.msg.createdAt).getTime() <= othersLastRead} />}
          </Box>
        )}
      />
      {!atBottom && (
        <IconButton
          icon={<FiChevronDown />} isRound size="sm" colorScheme="teal" position="absolute" bottom="12px" right="16px" boxShadow="lg" zIndex={1}
          aria-label="Scroll to latest"
          onClick={() => virtuoso.current?.scrollToIndex({ index: rows.length - 1, align: 'end', behavior: 'smooth' })}
        />
      )}
    </Box>
  );
};

export default MessageTimeline;
