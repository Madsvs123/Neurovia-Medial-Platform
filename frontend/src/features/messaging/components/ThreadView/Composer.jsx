import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Flex, HStack, Text, Textarea, IconButton, Button, ButtonGroup, useColorModeValue,
} from '@chakra-ui/react';
import { FiSend, FiLock, FiMessageSquare } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import TemplatePicker from './TemplatePicker';

/**
 * Message composer with:
 *  - Reply / Internal note toggle (staff only)
 *  - template picker (staff only)
 *  - typing indicator events
 *  - lock states: observing (must join), closed (staff must reopen),
 *    and soft notices for requesters on resolved/closed threads
 */
const Composer = ({
  thread,
  capabilities = {},
  isStaff = false,
  sending = false,
  onSend,
  onTyping,
  onJoin,
  onReopen,
  compact = false,
}) => {
  const { t } = useTranslation('messaging');
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text'); // 'text' | 'note'
  const typingTimer = useRef(null);
  const border = useColorModeValue('gray.200', 'gray.700');
  const noteBg = useColorModeValue('yellow.50', 'yellow.900');
  const infoBg = useColorModeValue('gray.50', 'gray.700');

  const isRequester = thread?.me?.role === 'requester';
  const canReply = !!capabilities.reply;
  const canNote = !!capabilities.note;
  const closedForStaff = isStaff && thread?.status === 'closed';

  useEffect(() => { setText(''); setMode('text'); }, [thread?._id]);

  const submit = () => {
    const body = text.trim();
    if (!body || sending) return;
    onSend?.({ body, kind: mode });
    setText('');
    onTyping?.(false);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (!onTyping) return;
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2000);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  // ── Locked states ────────────────────────────────────────────────
  if (!canReply && !canNote) {
    return (
      <Flex p={3} borderTopWidth="1px" borderColor={border} bg={infoBg} align="center" justify="space-between" gap={3} flexWrap="wrap">
        <Text fontSize="sm" color="gray.500">{t('composer.observing')}</Text>
        {(capabilities.join || capabilities.claim) && onJoin && (
          <Button size="sm" colorScheme="teal" onClick={onJoin}>{capabilities.claim ? t('actions.claim') : t('actions.join')}</Button>
        )}
      </Flex>
    );
  }

  if (closedForStaff && mode === 'text') {
    return (
      <Flex p={3} borderTopWidth="1px" borderColor={border} bg={infoBg} align="center" justify="space-between" gap={3} flexWrap="wrap">
        <Text fontSize="sm" color="gray.500">{t('composer.closedStaff')}</Text>
        <HStack>
          {canNote && <Button size="sm" variant="outline" leftIcon={<FiLock />} onClick={() => setMode('note')}>{t('composer.note')}</Button>}
          {capabilities.transitions?.includes('open') && onReopen && (
            <Button size="sm" colorScheme="orange" onClick={onReopen}>{t('actions.reopen')}</Button>
          )}
        </HStack>
      </Flex>
    );
  }

  const notice = !isStaff && isRequester
    ? (thread?.status === 'closed' ? t('composer.closedRequester') : thread?.status === 'resolved' ? t('composer.resolvedRequester') : null)
    : null;

  return (
    <Box p={compact ? 2 : 3} borderTopWidth="1px" borderColor={border} bg={mode === 'note' ? noteBg : undefined} transition="background 0.15s">
      {notice && <Text fontSize="xs" color="gray.500" mb={2}>{notice}</Text>}

      {(isStaff && !compact) && (
        <Flex justify="space-between" align="center" mb={2} gap={2} flexWrap="wrap">
          <HStack spacing={2}>
            {canNote && (
              <ButtonGroup size="xs" isAttached variant="outline">
                <Button leftIcon={<FiMessageSquare />} isActive={mode === 'text'} onClick={() => setMode('text')} isDisabled={closedForStaff}>{t('composer.reply')}</Button>
                <Button leftIcon={<FiLock />} isActive={mode === 'note'} onClick={() => setMode('note')} colorScheme={mode === 'note' ? 'yellow' : undefined}>{t('composer.note')}</Button>
              </ButtonGroup>
            )}
            <TemplatePicker onSelect={(body) => setText((cur) => (cur ? `${cur}\n${body}` : body))} />
          </HStack>
          <Text fontSize="xs" color="gray.400" display={{ base: 'none', md: 'block' }}>{t('composer.hint')}</Text>
        </Flex>
      )}

      <Flex gap={2} align="flex-end">
        <Textarea
          value={text}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder={mode === 'note' ? t('composer.notePlaceholder') : t('composer.placeholder')}
          aria-label={mode === 'note' ? t('composer.note') : t('composer.reply')}
          size="sm"
          rows={Math.min(6, Math.max(compact ? 1 : 2, text.split('\n').length))}
          resize="none"
          isDisabled={sending}
          flex={1}
          borderRadius="lg"
          bg={mode === 'note' ? 'white' : undefined}
          _dark={{ bg: mode === 'note' ? 'gray.800' : undefined }}
        />
        <IconButton
          icon={mode === 'note' ? <FiLock /> : <FiSend />}
          colorScheme={mode === 'note' ? 'yellow' : 'teal'}
          aria-label={mode === 'note' ? t('actions.sendNote') : t('actions.send')}
          isLoading={sending}
          isDisabled={!text.trim()}
          onClick={submit}
          borderRadius="lg"
        />
      </Flex>
    </Box>
  );
};

export default Composer;
