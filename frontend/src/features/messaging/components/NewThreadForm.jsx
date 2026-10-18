import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, VStack, HStack, Text, Heading, FormControl, FormLabel, Input, Select, Textarea, Button, Icon,
  SimpleGrid, useColorModeValue, Spinner, Avatar, Badge,
} from '@chakra-ui/react';
import { FiLifeBuoy, FiUser, FiUsers, FiSend, FiX, FiSearch } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useRecipients, useCreateThread, useMessagingConfig } from '../hooks';
import { displayName, isStaffRole } from '../model/meta';
import { RoleBadge } from './atoms';

const KIND_ICON = { support: FiLifeBuoy, direct: FiUser, internal: FiUsers };

/**
 * Kind-aware "new conversation" form.
 *  - student  : Support (→ team, category picker) | Ask my instructor (→ recipient from enrolled programs)
 *  - educator : Direct (own students / colleagues) | Internal request (→ admin team)
 *  - admin    : Direct (anyone) | Internal (→ a specific staff member, optional)
 * Pre-fill via `initial` ({ kind, to, programId, courseId, lessonId, subject }).
 */
const NewThreadForm = ({ currentUser, initial = {}, onCreated, onCancel, compact = false }) => {
  const { t } = useTranslation();
  const { data: config } = useMessagingConfig();
  const creatable = useMemo(() => config?.me?.creatableKinds || [], [config]);
  const isStaff = isStaffRole(currentUser?.role);
  const [kind, setKind] = useState(initial.kind || null);
  const [q, setQ] = useState('');
  const [to, setTo] = useState(null);
  const [programId, setProgramId] = useState(initial.programId || '');
  const [category, setCategory] = useState(initial.category || 'general');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject] = useState(initial.subject || '');
  const [body, setBody] = useState(initial.body || '');
  const create = useCreateThread();
  const cardBg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  useEffect(() => { if (!kind && creatable.length === 1) setKind(creatable[0]); }, [creatable, kind]);

  const needsRecipient = kind === 'direct' || (kind === 'internal' && currentUser?.role === 'admin');
  const { data: directory, isLoading: dirLoading } = useRecipients({ kind: kind === 'internal' ? 'internal' : 'direct', q }, !!kind && kind !== 'support');

  // Pre-select recipient once the directory arrives
  useEffect(() => {
    if (initial.to && directory?.users && !to) {
      const found = directory.users.find((u) => u._id === initial.to);
      if (found) setTo(found);
    }
  }, [initial.to, directory, to]);

  const programs = directory?.programs || [];
  const kindHint = useMemo(() => {
    if (kind === 'support') return t('kinds.supportHint');
    if (kind === 'direct') return isStaff ? t('kinds.directStaffHint') : t('kinds.directHint');
    if (kind === 'internal') return t('kinds.internalHint');
    return '';
  }, [kind, isStaff, t]);

  const canSubmit = kind && subject.trim() && body.trim() && (!needsRecipient || to || kind === 'internal');

  const submit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    const payload = {
      kind, subject: subject.trim(), body: body.trim(), category, priority,
      to: to?._id || undefined,
      context: { programId: programId || initial.programId || undefined, courseId: initial.courseId, lessonId: initial.lessonId },
    };
    if (kind === 'support' || kind === 'internal') payload.context.programId = programId || initial.programId || undefined;
    create.mutate(payload, { onSuccess: (thread) => onCreated?.(thread) });
  };

  return (
    <Box as="form" onSubmit={submit} maxW={compact ? '100%' : '760px'} mx="auto" w="100%">
      {!compact && <Heading size="md" mb={4}>{t('new.title')}</Heading>}

      {/* Step 1: kind */}
      {creatable.length > 1 && (
        <Box mb={4}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>{t('new.whatDoYouNeed')}</Text>
          <SimpleGrid columns={{ base: 1, sm: creatable.length }} spacing={2}>
            {creatable.map((k) => (
              <Box
                key={k} as="button" type="button" onClick={() => { setKind(k); setTo(null); }}
                textAlign="left" p={3} borderRadius="lg" borderWidth="2px" bg={cardBg}
                borderColor={kind === k ? 'teal.400' : border} _hover={{ borderColor: 'teal.300' }}
                aria-pressed={kind === k}
              >
                <HStack spacing={2} mb={1}><Icon as={KIND_ICON[k]} color="teal.500" /><Text fontWeight="semibold" fontSize="sm">{k === 'direct' && !isStaff ? t('widget.askInstructor') : t(`kinds.${k}`)}</Text></HStack>
                <Text fontSize="xs" color="gray.500">{k === 'support' ? t('kinds.supportHint') : k === 'direct' ? (isStaff ? t('kinds.directStaffHint') : t('kinds.directHint')) : t('kinds.internalHint')}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {kind && (
        <VStack spacing={4} align="stretch" bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="lg" p={compact ? 3 : 5}>
          {creatable.length === 1 && <Text fontSize="xs" color="gray.500">{kindHint}</Text>}

          {/* Recipient */}
          {kind !== 'support' && (
            <FormControl isRequired={needsRecipient && kind !== 'internal'}>
              <FormLabel fontSize="sm">{t('labels.recipient')}{kind === 'internal' && currentUser?.role === 'admin' ? ' (optional)' : ''}</FormLabel>
              {to ? (
                <Flex align="center" justify="space-between" p={2} borderWidth="1px" borderColor={border} borderRadius="md">
                  <HStack><Avatar size="xs" name={displayName(to)} /><Text fontSize="sm" fontWeight="medium">{displayName(to)}</Text><RoleBadge role={to.role} /><Text fontSize="xs" color="gray.500">{to.email}</Text></HStack>
                  <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={() => setTo(null)}>{t('actions.cancel')}</Button>
                </Flex>
              ) : kind === 'internal' && currentUser?.role === 'educator' ? (
                <Text fontSize="sm" color="gray.500">{t('new.internalNote')}</Text>
              ) : (
                <Box>
                  <Flex align="center" gap={2} mb={2}>
                    <Icon as={FiSearch} color="gray.400" />
                    <Input size="sm" placeholder={t('new.recipientSearch')} value={q} onChange={(e) => setQ(e.target.value)} />
                  </Flex>
                  <Box maxH="200px" overflowY="auto" borderWidth="1px" borderColor={border} borderRadius="md">
                    {dirLoading ? <Flex p={3} justify="center"><Spinner size="sm" /></Flex>
                      : (directory?.users || []).length === 0 ? <Text p={3} fontSize="sm" color="gray.500">{t('new.noRecipients')}</Text>
                        : (directory.users.map((u) => (
                          <Flex key={u._id} as="button" type="button" w="100%" textAlign="left" align="center" gap={2} p={2} _hover={{ bg: hoverBg }} onClick={() => setTo(u)}>
                            <Avatar size="xs" name={displayName(u)} /><Text fontSize="sm" flex={1}>{displayName(u)}</Text><RoleBadge role={u.role} /><Text fontSize="xs" color="gray.500">{u.email}</Text>
                          </Flex>
                        )))}
                  </Box>
                  {kind === 'internal' && currentUser?.role === 'admin' && <Text fontSize="xs" color="gray.500" mt={1}>{t('new.internalNote')}</Text>}
                </Box>
              )}
            </FormControl>
          )}

          {/* About which program (students/educators) */}
          {programs.length > 0 && kind !== 'internal' && (
            <FormControl>
              <FormLabel fontSize="sm">{t('new.aboutProgram')}</FormLabel>
              <Select size="sm" value={programId} onChange={(e) => setProgramId(e.target.value)}>
                <option value="">{t('new.noProgram')}</option>
                {programs.map((p) => <option key={p._id} value={p._id}>{p.title}{p.code ? ` · ${p.code}` : ''}</option>)}
              </Select>
            </FormControl>
          )}

          <SimpleGrid columns={{ base: 1, sm: kind === 'direct' ? 1 : 2 }} spacing={3}>
            {kind !== 'direct' && (
              <FormControl>
                <FormLabel fontSize="sm">{t('labels.category')}</FormLabel>
                <Select size="sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {(config?.categories || []).filter((c) => (kind === 'internal' ? true : c !== 'course' || !isStaff)).map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                </Select>
                {kind === 'support' && <Text fontSize="xs" color="gray.500" mt={1}>{t('new.supportTeamNote')}</Text>}
              </FormControl>
            )}
            {kind !== 'direct' && isStaff && (
              <FormControl>
                <FormLabel fontSize="sm">{t('labels.priority')}</FormLabel>
                <Select size="sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {(config?.priorities || []).map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                </Select>
              </FormControl>
            )}
          </SimpleGrid>

          <FormControl isRequired>
            <FormLabel fontSize="sm">{t('labels.subject')}</FormLabel>
            <Input size="sm" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('new.subjectPlaceholder')} maxLength={200} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel fontSize="sm">{t('labels.message')}</FormLabel>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={compact ? 4 : 7} placeholder={t('new.messagePlaceholder')} />
          </FormControl>

          <Flex justify="flex-end" gap={2}>
            {onCancel && <Button variant="ghost" onClick={onCancel}>{t('actions.cancel')}</Button>}
            <Button type="submit" colorScheme="teal" rightIcon={<FiSend />} isDisabled={!canSubmit} isLoading={create.isPending}>{t('actions.create')}</Button>
          </Flex>
          {kind === 'support' && <Badge alignSelf="flex-start" colorScheme="gray" fontSize="2xs" textTransform="none">{t('kinds.supportHint')}</Badge>}
        </VStack>
      )}
    </Box>
  );
};

export default NewThreadForm;
