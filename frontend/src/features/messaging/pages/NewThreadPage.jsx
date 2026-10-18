import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, Heading, IconButton, Button, FormControl, FormLabel, Input, Select, Textarea, VStack,
  HStack, Text, SimpleGrid, useColorModeValue, useToast, Icon, FormHelperText,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSend, FiLifeBuoy, FiUser, FiShield, FiX } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateThread, useMessagingConfig, useRecipients } from '../hooks/useMessaging';
import { PeoplePicker } from '../components/ThreadView/ThreadDialogs';
import { UserAvatar, RoleBadge } from '../components/shared/Badges';
import { displayName } from '../model/meta';

const CATEGORIES = ['general', 'billing', 'technical', 'clinical', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const KIND_META = {
  support: { icon: FiLifeBuoy, title: 'new.kindSupport', hint: 'new.kindSupportHint' },
  direct: { icon: FiUser, title: 'new.kindDirect', hint: 'new.kindDirectHint' },
  internal: { icon: FiShield, title: 'new.kindInternal', hint: 'new.kindInternalHint' },
};

/**
 * "What do you need?" → kind-specific form.
 *  - student:  support (team by topic) | direct (educators of my programs)
 *  - educator: direct (my students / colleagues) | internal (request to admins)
 *  - admin:    direct (anyone) | internal (task to an educator)
 * Query params pre-fill: ?kind=direct&to=<userId>&programId=<id>&courseId=<id>
 */
const NewThreadPage = ({ portal, currentUser }) => {
  const { t } = useTranslation('messaging');
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { data: config } = useMessagingConfig();
  const create = useCreateThread();

  const kinds = portal.createKinds;
  const [kind, setKind] = useState(searchParams.get('kind') || (kinds.length === 1 ? kinds[0] : null));
  const [to, setTo] = useState(null);
  const [form, setForm] = useState({ subject: '', body: '', category: 'general', priority: 'normal' });
  const context = useMemo(() => ({
    programId: searchParams.get('programId') || undefined,
    courseId: searchParams.get('courseId') || undefined,
  }), [searchParams]);

  const cardBg = useColorModeValue('white', 'gray.800');
  const subtle = useColorModeValue('gray.50', 'gray.700');

  // Pre-select a recipient passed by a launch point (roster, program page…)
  const preselectId = searchParams.get('to');
  const { data: directory = [] } = useRecipients('', { enabled: !!preselectId });
  useEffect(() => {
    if (preselectId && !to) {
      const found = directory.find((u) => String(u._id) === String(preselectId));
      if (found) setTo(found);
    }
  }, [preselectId, directory, to]);

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = portal.isStaff;
  const needsRecipient = kind === 'direct' || (kind === 'internal' && isAdmin && to);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const labelFor = (k) => {
    if (k === 'direct' && isStaff) return { title: t('new.kindDirectStaff'), hint: t('new.kindDirectStaffHint') };
    if (k === 'internal' && isAdmin) return { title: t('new.kindTask'), hint: t('new.kindInternalHint') };
    return { title: t(KIND_META[k].title), hint: t(KIND_META[k].hint) };
  };

  const submit = async (e) => {
    e.preventDefault();
    if (kind === 'direct' && !to) {
      toast({ title: t('new.chooseRecipient'), status: 'warning', duration: 3000 });
      return;
    }
    try {
      const thread = await create.mutateAsync({
        kind,
        to: to?._id,
        subject: form.subject.trim(),
        body: form.body.trim(),
        category: kind === 'direct' ? undefined : form.category,
        priority: isStaff && kind !== 'direct' ? form.priority : undefined,
        context: Object.fromEntries(Object.entries(context).filter(([, v]) => v)),
      });
      toast({ title: t('new.sent'), status: 'success', duration: 2500 });
      navigate(`${portal.basePath}/${thread._id}`);
    } catch {
      /* toast handled by the mutation hook */
    }
  };

  return (
    <Box maxW="820px">
      <Flex align="center" gap={3} mb={5}>
        <IconButton icon={<FiArrowLeft />} aria-label={t('nav.back')} variant="ghost" onClick={() => (kind && kinds.length > 1 ? setKind(null) : navigate(portal.basePath))} />
        <Heading size="lg">
          {!kind ? t('new.title') : kind === 'support' ? t('new.titleSupport') : kind === 'direct' ? t('new.titleDirect') : labelFor('internal').title}
        </Heading>
      </Flex>

      {!kind ? (
        <Box>
          <Text color="gray.500" mb={4}>{t('new.whatDoYouNeed')}</Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {kinds.map((k) => {
              const { title, hint } = labelFor(k);
              return (
                <Box
                  key={k}
                  as="button"
                  type="button"
                  textAlign="left"
                  bg={cardBg}
                  borderWidth="1px"
                  borderRadius="xl"
                  p={5}
                  _hover={{ borderColor: 'teal.400', boxShadow: 'md' }}
                  onClick={() => setKind(k)}
                >
                  <Icon as={KIND_META[k].icon} boxSize={6} color="teal.500" mb={3} />
                  <Text fontWeight="bold">{title}</Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>{hint}</Text>
                </Box>
              );
            })}
          </SimpleGrid>
        </Box>
      ) : (
        <Box as="form" onSubmit={submit} bg={cardBg} borderWidth="1px" borderRadius="xl" p={{ base: 4, md: 6 }}>
          <VStack spacing={5} align="stretch">
            {(kind === 'direct' || (kind === 'internal' && isAdmin)) && (
              <FormControl isRequired={kind === 'direct'}>
                <FormLabel>{t('new.recipient')}</FormLabel>
                {to ? (
                  <HStack bg={subtle} p={3} borderRadius="md" justify="space-between">
                    <HStack>
                      <UserAvatar user={to} size="sm" />
                      <Box><Text fontWeight="semibold" fontSize="sm">{displayName(to)}</Text><Text fontSize="xs" color="gray.500">{to.email}</Text></Box>
                      <RoleBadge role={to.role} />
                    </HStack>
                    <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={() => setTo(null)}>{t('new.change')}</Button>
                  </HStack>
                ) : (
                  <Box bg={subtle} p={3} borderRadius="md">
                    <PeoplePicker onPick={setTo} roles={kind === 'internal' ? ['educator'] : null} />
                  </Box>
                )}
                {kind === 'internal' && isAdmin && !to && <FormHelperText>{t('new.kindInternalHint')}</FormHelperText>}
              </FormControl>
            )}

            {kind !== 'direct' && (
              <HStack align="flex-start" spacing={4}>
                <FormControl>
                  <FormLabel>{t('new.category')}</FormLabel>
                  <Select value={form.category} onChange={set('category')}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                  </Select>
                  {config?.routing?.categories?.[form.category] && (
                    <FormHelperText>{t(`team.${config.routing.categories[form.category]}`)}</FormHelperText>
                  )}
                </FormControl>
                {isStaff && (
                  <FormControl maxW="200px">
                    <FormLabel>{t('new.priority')}</FormLabel>
                    <Select value={form.priority} onChange={set('priority')}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
                    </Select>
                  </FormControl>
                )}
              </HStack>
            )}

            <FormControl isRequired>
              <FormLabel>{t('new.subject')}</FormLabel>
              <Input value={form.subject} onChange={set('subject')} placeholder={t('new.subjectPlaceholder')} maxLength={200} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>{t('new.message')}</FormLabel>
              <Textarea value={form.body} onChange={set('body')} placeholder={t('new.messagePlaceholder')} rows={7} />
            </FormControl>

            <Flex justify="flex-end" gap={3}>
              <Button variant="outline" onClick={() => navigate(portal.basePath)}>{t('actions.cancel')}</Button>
              <Button type="submit" colorScheme="teal" leftIcon={<FiSend />} isLoading={create.isPending} isDisabled={!form.subject.trim() || !form.body.trim() || (needsRecipient && kind === 'direct' && !to)}>
                {t('new.send')}
              </Button>
            </Flex>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default NewThreadPage;
