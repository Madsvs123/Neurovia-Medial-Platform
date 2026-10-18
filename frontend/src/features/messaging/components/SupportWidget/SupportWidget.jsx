import React, { useEffect, useState } from 'react';
import {
  Box, Flex, HStack, Text, Badge, IconButton, Icon, Button, Tooltip, useColorModeValue,
} from '@chakra-ui/react';
import { FiMessageCircle, FiX, FiMinimize2, FiMaximize2, FiPlus, FiExternalLink } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThreadList from '../ThreadList/ThreadList';
import ThreadView from '../ThreadView/ThreadView';
import { useThreadCounts } from '../../hooks/useMessaging';
import { studentPortal } from '../../portal/portalConfig';

const MotionBox = motion(Box);
export const OPEN_WIDGET_EVENT = 'neurovia:open-messages';

/**
 * Student floating launcher. Reuses the exact same hooks/ThreadList/
 * ThreadView as the full /messages pages (compact mode), so both stay in
 * sync through React Query. Hidden on the /messages pages themselves.
 */
const SupportWidget = ({ currentUser }) => {
  const { t } = useTranslation('messaging');
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const { data: counts } = useThreadCounts(!!currentUser);
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const unread = counts?.inbox || 0;

  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      setMinimized(false);
      if (e?.detail?.threadId) setThreadId(e.detail.threadId);
    };
    window.addEventListener(OPEN_WIDGET_EVENT, handler);
    return () => window.removeEventListener(OPEN_WIDGET_EVENT, handler);
  }, []);

  if (!currentUser || location.pathname.startsWith('/messages')) return null;

  const close = () => { setOpen(false); setMinimized(false); setThreadId(null); };

  return (
    <>
      <MotionBox position="fixed" bottom="20px" right="20px" zIndex={1000} initial={{ scale: 0 }} animate={{ scale: open ? 0 : 1 }}>
        <Tooltip label={unread ? t('widget.unreadTooltip', { count: unread }) : t('widget.open')} hasArrow>
          <Box position="relative">
            <IconButton icon={<FiMessageCircle size={22} />} aria-label={t('widget.open')} colorScheme="teal" size="lg" isRound boxShadow="lg" onClick={() => setOpen(true)} />
            {unread > 0 && (
              <Badge position="absolute" top="-4px" right="-4px" colorScheme="red" borderRadius="full" fontSize="11px" px={1.5} boxShadow="md">{unread > 99 ? '99+' : unread}</Badge>
            )}
          </Box>
        </Tooltip>
      </MotionBox>

      <AnimatePresence>
        {open && (
          <MotionBox
            position="fixed" bottom="20px" right="20px" zIndex={1001}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            w="400px" maxW="calc(100vw - 40px)" h={minimized ? '56px' : 'min(640px, calc(100vh - 80px))'}
            bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" boxShadow="2xl" overflow="hidden"
            display="flex" flexDirection="column"
          >
            <Flex bg="teal.500" color="white" px={3} py={2} align="center" justify="space-between" flexShrink={0} cursor={minimized ? 'pointer' : 'default'} onClick={() => minimized && setMinimized(false)}>
              <HStack spacing={2} minW={0}>
                <Icon as={FiMessageCircle} />
                <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{t('widget.title')}</Text>
                {unread > 0 && !threadId && <Badge colorScheme="red" borderRadius="full" fontSize="xs">{unread}</Badge>}
              </HStack>
              <HStack spacing={0.5}>
                <Tooltip label={t('nav.messages')}><IconButton icon={<FiExternalLink />} size="xs" variant="ghost" color="white" aria-label={t('nav.messages')} onClick={(e) => { e.stopPropagation(); close(); navigate(threadId ? `/messages/${threadId}` : '/messages'); }} /></Tooltip>
                <IconButton icon={minimized ? <FiMaximize2 /> : <FiMinimize2 />} size="xs" variant="ghost" color="white" aria-label={t('widget.minimize')} onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }} />
                <IconButton icon={<FiX />} size="xs" variant="ghost" color="white" aria-label={t('widget.close')} onClick={close} />
              </HStack>
            </Flex>

            {!minimized && (
              <Box flex={1} minH={0} display="flex" flexDirection="column">
                {threadId ? (
                  <ThreadView
                    key={threadId}
                    threadId={threadId}
                    currentUser={currentUser}
                    portal={studentPortal}
                    onBack={() => setThreadId(null)}
                    onNavigateToThread={setThreadId}
                    compact
                  />
                ) : (
                  <>
                    <Box p={2} borderBottomWidth="1px" borderColor={border}>
                      <Button size="sm" colorScheme="teal" w="100%" leftIcon={<FiPlus />} onClick={() => { close(); navigate('/messages/new'); }}>
                        {t('widget.startNew')}
                      </Button>
                    </Box>
                    <Box flex={1} minH={0}>
                      <ThreadList params={{ box: 'inbox' }} filters={{}} isStaff={false} activeId={null} onSelect={(th) => setThreadId(th._id)} />
                    </Box>
                  </>
                )}
              </Box>
            )}
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportWidget;
