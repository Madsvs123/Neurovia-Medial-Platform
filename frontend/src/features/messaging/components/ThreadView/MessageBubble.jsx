import React, { useState } from 'react';
import {
  Box, Flex, HStack, Text, IconButton, Menu, MenuButton, MenuList, MenuItem, Textarea, Button,
  useColorModeValue, Tooltip,
} from '@chakra-ui/react';
import { FiMoreHorizontal, FiEdit2, FiTrash2, FiLock } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { UserAvatar, RoleBadge } from '../shared/Badges';
import { displayName } from '../../model/meta';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * A text message or an internal note. Own messages align right. Internal
 * notes are amber with a lock icon and are never delivered to students
 * (the API strips them), so no client-side hiding is needed here.
 */
const MessageBubble = ({ message, isOwn, showHeader, canModerate = false, onEdit, onDelete, seenBy = [] }) => {
  const { t } = useTranslation('messaging');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);

  const isNote = message.kind === 'note';
  const otherBg = useColorModeValue('white', 'gray.700');
  const noteBg = useColorModeValue('yellow.50', 'yellow.900');
  const noteBorder = useColorModeValue('yellow.300', 'yellow.600');
  const border = useColorModeValue('gray.200', 'gray.600');

  const canEdit = isOwn && !message.deletedAt && (Date.now() - new Date(message.createdAt).getTime()) < EDIT_WINDOW_MS;
  const canDelete = (isOwn || canModerate) && !message.deletedAt;

  const bg = isNote ? noteBg : (isOwn ? 'teal.500' : otherBg);
  const color = isNote ? undefined : (isOwn ? 'white' : undefined);

  const submitEdit = () => {
    if (draft.trim() && draft.trim() !== message.body) onEdit?.(message._id, draft.trim());
    setEditing(false);
  };

  return (
    <Flex justify={isOwn && !isNote ? 'flex-end' : 'flex-start'} mb={showHeader ? 3 : 1} role="article" data-testid={`message-${message.kind}`}>
      {!isOwn && showHeader && !isNote && <UserAvatar user={message.sender} size="xs" mr={2} mt={1} />}
      {!isOwn && !showHeader && !isNote && <Box w="24px" mr={2} />}

      <Box maxW={{ base: '88%', md: '72%' }} w={isNote ? '100%' : 'auto'}>
        {showHeader && (!isOwn || isNote) && (
          <HStack spacing={1.5} mb={1}>
            {isNote && <FiLock size={11} color="#b7791f" aria-label={t('composer.note')} />}
            <Text fontSize="xs" fontWeight="bold" color={isNote ? 'yellow.700' : 'teal.600'}>
              {displayName(message.sender)}
            </Text>
            <RoleBadge role={message.sender?.role} fontSize="9px" />
            {isNote && <Text fontSize="10px" color="yellow.700">· {t('composer.note')}</Text>}
          </HStack>
        )}

        <Box
          bg={bg}
          color={color}
          borderWidth={isOwn && !isNote ? 0 : '1px'}
          borderColor={isNote ? noteBorder : border}
          borderStyle={isNote ? 'dashed' : 'solid'}
          px={3}
          py={2}
          borderRadius="xl"
          borderBottomRightRadius={isOwn && !isNote ? 'sm' : 'xl'}
          borderBottomLeftRadius={!isOwn && !isNote ? 'sm' : 'xl'}
          boxShadow="sm"
          position="relative"
          role="group"
        >
          {editing ? (
            <Box>
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} size="sm" bg="white" color="gray.800" rows={3} autoFocus />
              <HStack mt={2} justify="flex-end" spacing={2}>
                <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setDraft(message.body); }}>{t('actions.cancel')}</Button>
                <Button size="xs" colorScheme="teal" onClick={submitEdit}>{t('actions.save')}</Button>
              </HStack>
            </Box>
          ) : (
            <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word" lineHeight="1.55" fontStyle={message.deletedAt ? 'italic' : 'normal'} opacity={message.deletedAt ? 0.6 : 1}>
              {message.deletedAt ? t('system.deleted') : message.body}
            </Text>
          )}

          <Flex justify="flex-end" align="center" mt={1} gap={2}>
            {message.editedAt && !message.deletedAt && (
              <Text fontSize="10px" color={isOwn && !isNote ? 'whiteAlpha.700' : 'gray.400'}>({t('system.edited')})</Text>
            )}
            <Tooltip label={dayjs(message.createdAt).format('MMM D, YYYY h:mm A')} hasArrow openDelay={400}>
              <Text fontSize="10px" color={isOwn && !isNote ? 'whiteAlpha.800' : 'gray.400'}>
                {dayjs(message.createdAt).format('h:mm A')}
              </Text>
            </Tooltip>
            {(canEdit || canDelete) && (
              <Menu placement="bottom-end" isLazy>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreHorizontal />}
                  size="xs"
                  variant="ghost"
                  color={isOwn && !isNote ? 'whiteAlpha.800' : 'gray.400'}
                  aria-label={t('actions.moreActions')}
                  opacity={0.6}
                  _groupHover={{ opacity: 1 }}
                  minW="20px"
                  h="20px"
                />
                <MenuList color="gray.800" fontSize="sm">
                  {canEdit && <MenuItem icon={<FiEdit2 />} onClick={() => setEditing(true)}>{t('actions.edit')}</MenuItem>}
                  {canDelete && <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => onDelete?.(message._id)}>{t('actions.delete')}</MenuItem>}
                </MenuList>
              </Menu>
            )}
          </Flex>
        </Box>

        {isOwn && seenBy.length > 0 && (
          <Text fontSize="10px" color="gray.400" textAlign="right" mt={0.5}>
            {t('thread.seenBy', { name: seenBy.map(displayName).join(', ') })}
          </Text>
        )}
      </Box>
    </Flex>
  );
};

export default MessageBubble;
