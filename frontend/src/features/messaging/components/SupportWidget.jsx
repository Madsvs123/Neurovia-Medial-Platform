import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Flex, HStack, Text, IconButton, Icon, Badge, Button, VStack, Spinner, useColorModeValue, Tooltip,
} from '@chakra-ui/react';
import { FiMessageCircle, FiX, FiChevronLeft, FiExternalLink, FiLifeBuoy, FiUser } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useThreads, useThreadCounts, useMessagingConfig } from '../hooks';
import ThreadView from './ThreadView';
import NewThreadForm from './NewThreadForm';
import { ThreadListItem } from './ThreadList';
import { studentPortal } from '../portal';

const MotionBox = motion(Box);
export const OPEN_WIDGET_EVENT = 'neurovia:open-support-chat';

/**
 * Student floating launcher. Reuses the same hooks/components as the full
 * /messages page (one source of truth) — it's just a compact viewport.
 * Hidden on the /messages routes themselves.
 */
const SupportWidget = ({ currentUser }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ name: 'list' }); // list | new | thread
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const { data: counts } = useThreadCounts(!!currentUser);
  const { data: config } = useMessagingConfig(!!currentUser);
  const { items, isLoading } = useThreads({ box: 'inbox', limit: 10 });
  const unread = counts?.unread || 0;

  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      const id = e?.detail?.threadId;
      const kind = e?.detail?.kind;
      if (id) setView({ name: 'thread', id });
      else if (kind) setView({ name: 'new', kind });
      else setView({ name: 'list' });
    };
    window.addEventListener(OPEN_WIDGET_EVENT, handler);
    return () => window.removeEventListener(OPEN_WIDGET_EVENT, handler);
  }, []);

  if (!currentUser || location.pathname.startsWith('/messages')) return null;

  const header = view.name === 'thread' ? t('widget.title') : view.name === 'new' ? t('new.title') : t('widget.title');

  return (
    <>
      <MotionBox position="fixed" bottom="20px" right="20px" zIndex={1000} initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <Tooltip label={t('widget.open')} hasArrow>
          <Box position="relative">
            <IconButton icon={<FiMessageCircle size={22} />} aria-label={t('widget.open')} colorScheme="teal" size="lg" isRound boxShadow="lg" onClick={() => setOpen(true)} />
            {unread > 0 && <Badge position="absolute" top="-4px" right="-4px" colorScheme="red" borderRadius="full" fontSize="11px" px={1.5}>{unread > 99 ? '99+' : unread}</Badge>}
          </Box>
        </Tooltip>
      </MotionBox>

      <AnimatePresence>
        {open && (
          <MotionBox
            position="fixed" bottom="20px" right="20px" zIndex={1001}
            w="420px" maxW="calc(100vw - 40px)" h="min(640px, calc(100vh - 100px))"
            initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }}
            bg={bg} borderRadius="xl" boxShadow="2xl" borderWidth="1px" borderColor={border} overflow="hidden" display="flex" flexDirection="column"
            role="dialog" aria-label={t('widget.title')}
          >
            <Flex bg="teal.500" color="white" px={3} py={2.5} align="center" gap={2}>
              {view.name !== 'list' && <IconButton icon={<FiChevronLeft />} size="xs" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} aria-label={t('actions.back')} onClick={() => setView({ name: 'list' })} />}
              <Icon as={FiMessageCircle} />
              <Text fontWeight="bold" fontSize="sm" flex={1} noOfLines={1}>{header}</Text>
              <Tooltip label={t('widget.viewAll')} hasArrow><IconButton icon={<FiExternalLink />} size="xs" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} aria-label={t('widget.viewAll')} onClick={() => { setOpen(false); navigate(view.name === 'thread' ? studentPortal.threadPath(view.id) : studentPortal.basePath); }} /></Tooltip>
              <IconButton icon={<FiX />} size="xs" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} aria-label="Close" onClick={() => setOpen(false)} />
            </Flex>

            {view.name === 'list' && (
              <Flex direction="column" flex={1} minH={0}>
                <HStack p={2} spacing={2} borderBottomWidth="1px" borderColor={border}>
                  <Button size="sm" flex={1} colorScheme="teal" leftIcon={<FiLifeBuoy />} onClick={() => setView({ name: 'new', kind: 'support' })}>{t('widget.newTicket')}</Button>
                  <Button size="sm" flex={1} variant="outline" colorScheme="teal" leftIcon={<FiUser />} onClick={() => setView({ name: 'new', kind: 'direct' })}>{t('widget.askInstructor')}</Button>
                </HStack>
                <Box flex={1} minH={0} overflowY="auto">
                  {isLoading ? <Flex justify="center" py={8}><Spinner size="sm" color="teal.500" /></Flex>
                    : items.length === 0 ? (
                      <VStack py={10} color="gray.500" spacing={1}><Icon as={FiMessageCircle} boxSize={8} opacity={0.25} /><Text fontSize="sm">{t('empty.inbox')}</Text></VStack>
                    ) : items.map((th) => (
                      <ThreadListItem key={th._id} thread={th} active={false} onClick={() => setView({ name: 'thread', id: th._id })} currentUser={currentUser} sla={config?.sla} />
                    ))}
                </Box>
              </Flex>
            )}
            {view.name === 'new' && (
              <Box flex={1} minH={0} overflowY="auto" p={3}>
                <NewThreadForm compact currentUser={currentUser} initial={{ kind: view.kind }} onCancel={() => setView({ name: 'list' })} onCreated={(th) => setView({ name: 'thread', id: th._id })} />
              </Box>
            )}
            {view.name === 'thread' && (
              <Box flex={1} minH={0} display="flex" flexDirection="column">
                <ThreadView key={view.id} threadId={view.id} currentUser={currentUser} config={config} portal={studentPortal} compact onBack={() => setView({ name: 'list' })} />
              </Box>
            )}
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportWidget;
