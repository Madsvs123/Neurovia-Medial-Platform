import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Flex, HStack, Text, Textarea, IconButton, Button, ButtonGroup, Tooltip, useColorModeValue, Icon,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverHeader, PopoverArrow, Input, VStack, Badge,
} from '@chakra-ui/react';
import { FiSend, FiLock, FiMessageSquare, FiZap } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useTemplates } from '../hooks';

/** Quick-reply picker fed by /messaging/templates (role-filtered server side). */
const QuickReplies = ({ onPick, size = 'xs' }) => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const { data: templates = [] } = useTemplates({});
  const bg = useColorModeValue('white', 'gray.800');
  const groups = templates
    .filter((tpl) => !q || tpl.title.toLowerCase().includes(q.toLowerCase()) || tpl.body.toLowerCase().includes(q.toLowerCase()) || tpl.category.toLowerCase().includes(q.toLowerCase()))
    .reduce((acc, tpl) => { (acc[tpl.category] = acc[tpl.category] || []).push(tpl); return acc; }, {});

  return (
    <Popover placement="top-start" isLazy>
      <PopoverTrigger>
        <Button size={size} variant="outline" leftIcon={<FiZap />} borderRadius="lg">{t('actions.quickReply')}</Button>
      </PopoverTrigger>
      <PopoverContent w="440px" maxW="92vw" bg={bg} boxShadow="xl">
        <PopoverArrow />
        <PopoverHeader py={2}>
          <Input size="sm" placeholder={t('actions.search')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </PopoverHeader>
        <PopoverBody maxH="320px" overflowY="auto">
          {Object.keys(groups).length === 0 ? (
            <Text fontSize="sm" color="gray.500" py={4} textAlign="center">{t('empty.templates')}</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {Object.entries(groups).map(([cat, list]) => (
                <Box key={cat}>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>{cat}</Text>
                  <VStack align="stretch" spacing={1}>
                    {list.map((tpl) => (
                      <Button key={tpl._id} size="sm" variant="ghost" justifyContent="flex-start" h="auto" py={1.5} whiteSpace="normal" textAlign="left" onClick={() => onPick(tpl.body)}>
                        <Box>
                          <Text fontSize="xs" fontWeight="semibold">{tpl.title}</Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={2}>{tpl.body}</Text>
                        </Box>
                      </Button>
                    ))}
                  </VStack>
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Message composer.
 *  - `locked`: show `lockedMessage` (+ optional `onUnlock` CTA) instead of the input
 *  - `allowNotes`: shows the Message / Note toggle (staff on tickets only)
 *  - `quickReplies`: show the template picker (staff)
 *  - `onTyping`: throttled typing callback
 */
const Composer = ({
  onSend, sending = false, locked = false, lockedMessage = '', onUnlock = null, unlockLabel = '',
  allowNotes = false, quickReplies = false, onTyping = null, autoFocus = false, compact = false,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text');
  const ref = useRef(null);
  const border = useColorModeValue('gray.200', 'gray.700');
  const noteBg = useColorModeValue('yellow.50', 'yellow.900');
  const lockedBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  const submit = () => {
    const body = text.trim();
    if (!body || sending) return;
    onSend({ body, kind: mode });
    setText('');
    setMode('text');
    ref.current?.focus();
  };

  if (locked) {
    return (
      <Flex p={3} m={compact ? 2 : 3} bg={lockedBg} borderRadius="lg" align="center" justify="space-between" gap={3} flexWrap="wrap">
        <HStack spacing={2} color="gray.600" _dark={{ color: 'gray.300' }}><Icon as={FiLock} /><Text fontSize="sm">{lockedMessage}</Text></HStack>
        {onUnlock && <Button size="sm" colorScheme="teal" variant="outline" onClick={onUnlock}>{unlockLabel}</Button>}
      </Flex>
    );
  }

  return (
    <Box p={compact ? 2 : 3} borderTopWidth="1px" borderColor={border} bg={mode === 'note' ? noteBg : undefined} transition="background 0.15s">
      {(allowNotes || quickReplies) && (
        <Flex justify="space-between" align="center" mb={2} gap={2} flexWrap="wrap">
          <HStack spacing={2}>
            {allowNotes && (
              <ButtonGroup size="xs" isAttached variant="outline">
                <Button leftIcon={<FiMessageSquare />} isActive={mode === 'text'} onClick={() => setMode('text')} aria-pressed={mode === 'text'}>{t('composer.messageMode')}</Button>
                <Button leftIcon={<FiLock />} isActive={mode === 'note'} onClick={() => setMode('note')} aria-pressed={mode === 'note'} colorScheme={mode === 'note' ? 'yellow' : undefined}>{t('composer.noteMode')}</Button>
              </ButtonGroup>
            )}
            {quickReplies && <QuickReplies onPick={(body) => { setText((v) => (v ? `${v}\n${body}` : body)); ref.current?.focus(); }} />}
          </HStack>
          <Text fontSize="xs" color="gray.400" display={{ base: 'none', md: 'block' }}>{t('composer.hint')}</Text>
        </Flex>
      )}
      {mode === 'note' && (
        <Badge colorScheme="yellow" mb={2} fontSize="2xs" textTransform="none"><Icon as={FiLock} mr={1} />{t('composer.notePlaceholder')}</Badge>
      )}
      <Flex gap={2} align="flex-end">
        <Textarea
          ref={ref}
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={mode === 'note' ? t('composer.notePlaceholder') : t('composer.placeholder')}
          aria-label={mode === 'note' ? t('composer.noteMode') : t('composer.messageMode')}
          size="sm" rows={Math.min(6, Math.max(1, text.split('\n').length))} resize="none" borderRadius="lg" minH="40px" maxH="160px"
          isDisabled={sending}
        />
        <Tooltip label={mode === 'note' ? t('actions.sendNote') : t('actions.send')} hasArrow>
          <IconButton icon={<FiSend />} colorScheme={mode === 'note' ? 'yellow' : 'teal'} aria-label={mode === 'note' ? t('actions.sendNote') : t('actions.send')} isLoading={sending} isDisabled={!text.trim()} onClick={submit} borderRadius="lg" />
        </Tooltip>
      </Flex>
    </Box>
  );
};

export default Composer;
