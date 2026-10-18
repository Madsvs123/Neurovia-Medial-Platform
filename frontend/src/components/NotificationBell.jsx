import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton, Badge, Box, Text, VStack, HStack, Flex,
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody,
  PopoverArrow, PopoverCloseButton, Button, Divider, Spinner, Icon,
  useColorModeValue, Tooltip
} from '@chakra-ui/react';
import { FiBell, FiCheck, FiTrash2, FiChevronRight } from 'react-icons/fi';
// NOTE: the actual API calls always go through the `api` prop (see getApi()
// below) so this component works unmodified in the student/admin/educator
// portals, each of which passes its own bound API module.

const TYPE_COLORS = {
  subscription: 'yellow',
  education: 'blue',
  program: 'purple',
  clinical_case: 'teal',
  flashcard: 'orange',
  doctor_tool: 'cyan',
  quiz: 'pink',
  course: 'green',
  lesson: 'blue',
  system: 'gray',
  user: 'red',
  payment: 'green',
  new_message: 'blue',
  new_conversation: 'teal',
};

const TIME_AGO = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

const NotificationBell = ({ api }) => {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  // Hoisted so they're called unconditionally exactly once per render —
  // these used to be called inline inside `notifs.map(...)`, one conditionally
  // on `notif.read`, which violates the Rules of Hooks (varying hook call
  // count/order per render) and can corrupt color-mode state across renders.
  const unreadItemBg = useColorModeValue('teal.50', 'gray.750');
  const itemBorderColor = useColorModeValue('gray.100', 'gray.700');
  const popoverBorderColor = useColorModeValue('gray.200', 'gray.600');

  // api param: which API service to use (public, admin, or educator)
  const getApi = () => {
    // Dynamic import — the caller passes the api object
    return api;
  };

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await getApi().getUnreadCount();
      setUnread(data.unreadCount || 0);
    } catch { /* ignore */ }
  }, [api]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getApi().getNotifications({ limit: 10 });
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchUnread();
    // Fallback poll — the socket ('neurovia:notification' below) normally
    // delivers updates instantly; this just covers a dropped connection.
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Instant update pushed by MessagingSocketProvider when the server emits
  // `notification:new` over the socket.
  useEffect(() => {
    const onPush = () => {
      fetchUnread();
      if (open) fetchNotifications();
    };
    window.addEventListener('neurovia:notification', onPush);
    return () => window.removeEventListener('neurovia:notification', onPush);
  }, [fetchUnread, fetchNotifications, open]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleClick = async (notif) => {
    try {
      await getApi().markNotificationAsRead(notif._id);
      setUnread((prev) => Math.max(0, prev - 1));
      setNotifs((prev) => prev.map((n) => n._id === notif._id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await getApi().markAllNotificationsAsRead();
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  return (
    <Popover isOpen={open} onClose={() => setOpen(false)} placement="bottom-end">
      <PopoverTrigger>
        <Box position="relative" onClick={() => setOpen(!open)} cursor="pointer">
          <IconButton
            icon={<FiBell />}
            variant="ghost"
            aria-label="Notifications"
            size="lg"
            fontSize="xl"
          />
          {unread > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorScheme="red"
              borderRadius="full"
              fontSize="xs"
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              zIndex={2}
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent
        w="360px"
        maxH="480px"
        shadow="lg"
        borderRadius="lg"
        border="1px solid"
        borderColor={popoverBorderColor}
      >
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="bold" fontSize="sm" borderBottomWidth="1px">
          <Flex justify="space-between" align="center">
            <Text>Notifications</Text>
            {unread > 0 && (
              <Button size="xs" variant="ghost" colorScheme="teal"
                leftIcon={<FiCheck />} onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            )}
          </Flex>
        </PopoverHeader>
        <PopoverBody p={0} overflowY="auto" maxH="400px">
          {loading ? (
            <Flex justify="center" py={8}><Spinner size="sm" /></Flex>
          ) : notifs.length === 0 ? (
            <Text textAlign="center" py={8} color="gray.400" fontSize="sm">
              No notifications
            </Text>
          ) : (
            <VStack spacing={0} align="stretch">
              {notifs.map((notif) => (
                <Box
                  key={notif._id}
                  px={4}
                  py={3}
                  cursor="pointer"
                  bg={notif.read ? 'transparent' : unreadItemBg}
                  _hover={{ bg: hoverBg }}
                  onClick={() => handleClick(notif)}
                  borderBottomWidth="1px"
                  borderBottomColor={itemBorderColor}
                  transition="background 0.1s"
                >
                  <Flex justify="space-between" align="flex-start" gap={2}>
                    <Box flex={1} minW={0}>
                      <Flex align="center" gap={2}>
                        {!notif.read && (
                          <Box w="8px" h="8px" borderRadius="full" bg="teal.500" flexShrink={0} mt="5px" />
                        )}
                        <Text
                          fontSize="sm"
                          fontWeight={notif.read ? 'normal' : 'semibold'}
                          noOfLines={1}
                        >
                          {notif.title}
                        </Text>
                      </Flex>
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        noOfLines={2}
                        mt={0.5}
                        ml={notif.read ? 0 : '20px'}
                      >
                        {notif.message}
                      </Text>
                      <HStack spacing={2} mt={1} ml={notif.read ? 0 : '20px'}>
                        <Badge
                          colorScheme={TYPE_COLORS[notif.type] || 'gray'}
                          variant="subtle"
                          fontSize="10px"
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                        >
                          {notif.type}
                        </Badge>
                        <Text fontSize="10px" color="gray.400">
                          {TIME_AGO(notif.createdAt)}
                        </Text>
                        {notif.link && (
                          <Icon as={FiChevronRight} boxSize={3} color="gray.400" />
                        )}
                      </HStack>
                    </Box>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
