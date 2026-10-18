import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Flex, HStack, Text, Badge, IconButton, Icon,
    useColorModeValue, useToast, VStack, Button, Input, Select,
    Textarea, Spinner,
} from '@chakra-ui/react';
import {
    FiMessageCircle, FiX, FiMinimize2, FiMaximize2, FiPlus, FiChevronLeft, FiSend,
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
    createConversation,
    getMyConversations,
    sendMessage,
    getConversationMessages,
    deleteConversation,
    markConversationRead,
} from '../../services/api';
import SupportChatButton from './SupportChatButton';
import ConversationCard from './ConversationCard';
import ChatWindow from './ChatWindow';
import {
    CATEGORY_LABELS, ACTIVE_STATUSES, RESOLVED_STATUSES, isOwnMessage,
} from './conversationStatus';
import { t } from '../conversationText';
import { useConversationSocket } from './useConversationSocket';

const MotionBox = motion(Box);

export const OPEN_SUPPORT_CHAT_EVENT = 'neurovia:open-support-chat';

const FILTERS = [
    { key: 'all', label: t('all') },
    { key: 'active', label: t('active') },
    { key: 'resolved', label: t('resolved') },
];

const SupportChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [view, setView] = useState('list'); // 'list' | 'form' | 'chat'
    const [selectedId, setSelectedId] = useState(null);
    const [filter, setFilter] = useState('all');
    const [formData, setFormData] = useState({ subject: '', category: 'general', message: '' });

    const toast = useToast();
    const queryClient = useQueryClient();
    const { userInfo } = useSelector((state) => state.auth);
    const myId = userInfo?._id || userInfo?.id;

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    useConversationSocket(!!userInfo);

    // --- Open requests from anywhere in the student portal (e.g. Support
    // page, Navbar "Messages" link, or a notification deep link carrying a
    // specific conversation id via `?conversationId=` — see SupportPage) ---
    useEffect(() => {
        const open = (event) => {
            setIsOpen(true);
            setIsMinimized(false);
            const targetId = event?.detail?.conversationId;
            if (targetId) {
                setSelectedId(targetId);
                setView('chat');
            }
        };
        window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, open);
        return () => window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, open);
    }, []);

    // --- Conversations (poll 30s) ---
    const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
        queryKey: ['my-conversations'],
        queryFn: async () => (await getMyConversations()).data,
        enabled: !!userInfo,
        refetchInterval: 30000,
    });

    const unreadCount = useMemo(
        () => conversations.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0),
        [conversations]
    );

    const activeConversation = useMemo(
        () => conversations.find(c => c._id === selectedId) || null,
        [conversations, selectedId]
    );

    // --- Messages of the open conversation (poll 5s) ---
    const { data: messages = [], isLoading: messagesLoading } = useQuery({
        queryKey: ['conversation-messages', selectedId],
        queryFn: async () => (await getConversationMessages(selectedId)).data,
        enabled: !!userInfo && isOpen && !!selectedId,
        refetchInterval: 5000,
    });

    // Mark incoming messages as read while the chat is open
    useEffect(() => {
        if (!selectedId || !isOpen || !userInfo) return;
        const hasUnread = messages.some(m => !m.read && !isOwnMessage(m, myId));
        if (!hasUnread) return;
        markConversationRead(selectedId)
            .then(() => queryClient.invalidateQueries({ queryKey: ['my-conversations'] }))
            .catch(() => { /* best-effort */ });
    }, [messages, selectedId, isOpen, userInfo, myId, queryClient]);

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: (data) => createConversation(data),
        onSuccess: (response) => {
            toast({ title: t('conversationStarted'), description: t('supportWillRespond'), status: 'success', duration: 3000, isClosable: true });
            setFormData({ subject: '', category: 'general', message: '' });
            setSelectedId(response.data._id);
            setView('chat');
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to start conversation', status: 'error', duration: 4000, isClosable: true });
        },
    });

    const sendMutation = useMutation({
        mutationFn: (text) => sendMessage(selectedId, { message: text }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedId] });
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to send message', status: 'error', duration: 4000, isClosable: true });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteConversation(id),
        onSuccess: (_res, id) => {
            toast({ title: t('delete'), status: 'success', duration: 2500, isClosable: true });
            if (selectedId === id) {
                setSelectedId(null);
                setView('list');
            }
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete conversation', status: 'error', duration: 4000, isClosable: true });
        },
    });

    // --- Handlers ---
    const openConversation = (conv) => {
        setSelectedId(conv._id);
        setView('chat');
        if ((Number(conv.unreadCount) || 0) > 0) {
            markConversationRead(conv._id)
                .then(() => queryClient.invalidateQueries({ queryKey: ['my-conversations'] }))
                .catch(() => { /* best-effort */ });
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setIsMinimized(false);
        setSelectedId(null);
        setView('list');
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (!formData.subject.trim()) {
            toast({ title: t('pleaseEnterSubject'), status: 'warning', duration: 3000 });
            return;
        }
        if (!formData.message.trim()) {
            toast({ title: t('pleaseEnterMessage'), status: 'warning', duration: 3000 });
            return;
        }
        createMutation.mutate({
            subject: formData.subject.trim(),
            category: formData.category,
            message: formData.message.trim(),
        });
    };

    const filteredConversations = useMemo(() => {
        if (filter === 'active') return conversations.filter(c => ACTIVE_STATUSES.includes(c.status));
        if (filter === 'resolved') return conversations.filter(c => RESOLVED_STATUSES.includes(c.status));
        return conversations;
    }, [conversations, filter]);

    if (!userInfo) return null;

    return (
        <>
            <SupportChatButton onClick={() => setIsOpen(true)} unreadCount={unreadCount} />

            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        position="fixed"
                        bottom="20px"
                        right="20px"
                        zIndex={1001}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{
                            opacity: 1, y: 0, scale: 1,
                            width: '420px',
                            maxWidth: 'calc(100vw - 40px)',
                            height: isMinimized ? '56px' : 'min(620px, calc(100vh - 100px))',
                        }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        bg={bgColor}
                        borderRadius="xl"
                        boxShadow="2xl"
                        overflow="hidden"
                        borderWidth="1px"
                        borderColor={borderColor}
                        display="flex"
                        flexDirection="column"
                    >
                        {/* Header */}
                        <Flex
                            bg="teal.500"
                            color="white"
                            p={3}
                            align="center"
                            justify="space-between"
                            cursor={isMinimized ? 'pointer' : 'default'}
                            onClick={() => isMinimized && setIsMinimized(false)}
                            flexShrink={0}
                        >
                            <HStack spacing={2} minW={0}>
                                <Icon as={FiMessageCircle} />
                                <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                                    {view === 'chat'
                                        ? activeConversation?.subject || t('supportChat')
                                        : view === 'form'
                                            ? t('newChat')
                                            : t('supportChat')}
                                </Text>
                                {view !== 'chat' && unreadCount > 0 && (
                                    <Badge colorScheme="red" borderRadius="full" fontSize="xs" px={1.5}>
                                        {unreadCount}
                                    </Badge>
                                )}
                            </HStack>
                            <HStack spacing={1}>
                                <IconButton
                                    icon={isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
                                    size="xs" variant="ghost" color="white"
                                    _hover={{ bg: 'whiteAlpha.200' }}
                                    aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                />
                                <IconButton
                                    icon={<FiX />} size="xs" variant="ghost" color="white"
                                    _hover={{ bg: 'whiteAlpha.200' }}
                                    aria-label="Close chat" onClick={handleClose}
                                />
                            </HStack>
                        </Flex>

                        {!isMinimized && (
                            <Box flex={1} minH={0} display="flex" flexDirection="column" overflow="hidden">
                                {/* ---------- LIST VIEW ---------- */}
                                {view === 'list' && (
                                    <>
                                        <Box p={3} borderBottomWidth="1px" borderColor={borderColor} flexShrink={0}>
                                            <Button
                                                size="sm" colorScheme="teal" w="full"
                                                leftIcon={<FiPlus />} mb={2} borderRadius="lg"
                                                onClick={() => { setView('form'); setSelectedId(null); }}
                                            >
                                                {t('startNewChat')}
                                            </Button>
                                            <Flex gap={1} flexWrap="wrap">
                                                {FILTERS.map(f => (
                                                    <Button
                                                        key={f.key} size="xs"
                                                        variant={filter === f.key ? 'solid' : 'ghost'}
                                                        colorScheme={filter === f.key ? 'teal' : 'gray'}
                                                        borderRadius="full" px={3}
                                                        onClick={() => setFilter(f.key)}
                                                    >
                                                        {f.label}
                                                    </Button>
                                                ))}
                                            </Flex>
                                        </Box>

                                        <Box flex={1} minH={0} overflowY="auto" p={2}>
                                            {conversationsLoading ? (
                                                <Flex justify="center" py={8}>
                                                    <Spinner size="sm" thickness="3px" color="teal.500" />
                                                </Flex>
                                            ) : filteredConversations.length === 0 ? (
                                                <VStack py={10} spacing={3}>
                                                    <Icon as={FiMessageCircle} boxSize={10} opacity={0.25} />
                                                    <Text fontSize="sm" color="gray.500" textAlign="center">
                                                        {t('noConversations')}
                                                    </Text>
                                                    <Button size="sm" colorScheme="teal" variant="outline" onClick={() => setView('form')}>
                                                        {t('startNewChat')}
                                                    </Button>
                                                </VStack>
                                            ) : (
                                                <VStack spacing={2} align="stretch">
                                                    {filteredConversations.map(conv => (
                                                        <ConversationCard
                                                            key={conv._id}
                                                            conversation={conv}
                                                            currentUserId={myId}
                                                            compact
                                                            onClick={openConversation}
                                                            onDelete={(c) => deleteMutation.mutate(c._id)}
                                                        />
                                                    ))}
                                                </VStack>
                                            )}
                                        </Box>
                                    </>
                                )}

                                {/* ---------- NEW CONVERSATION FORM ---------- */}
                                {view === 'form' && (
                                    <Box flex={1} minH={0} display="flex" flexDirection="column">
                                        <Flex p={2} px={3} borderBottomWidth="1px" borderColor={borderColor} align="center" gap={2} flexShrink={0}>
                                            <IconButton
                                                icon={<FiChevronLeft />} size="sm" variant="ghost"
                                                onClick={() => setView('list')} aria-label={t('back')}
                                            />
                                            <Text fontWeight="semibold" fontSize="sm">{t('newConversation')}</Text>
                                        </Flex>
                                        <Box flex={1} minH={0} overflowY="auto" p={4}>
                                            <Text fontSize="xs" color="gray.500" mb={4}>
                                                {t('supportWillRespond')}
                                            </Text>
                                            <form onSubmit={handleCreate}>
                                                <VStack spacing={3} align="stretch">
                                                    <Input
                                                        placeholder={`${t('subject')} *`}
                                                        value={formData.subject}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                                        size="md"
                                                        borderRadius="lg"
                                                    />
                                                    <Select
                                                        value={formData.category}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                                        size="md"
                                                        borderRadius="lg"
                                                    >
                                                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                                            <option key={key} value={key}>{label}</option>
                                                        ))}
                                                    </Select>
                                                    <Textarea
                                                        placeholder={`${t('message')} *`}
                                                        value={formData.message}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                                        rows={4}
                                                        resize="none"
                                                        borderRadius="lg"
                                                    />
                                                    <Button
                                                        type="submit" colorScheme="teal" w="full"
                                                        isLoading={createMutation.isPending}
                                                        rightIcon={<FiSend />} borderRadius="lg"
                                                    >
                                                        {t('startConversation')}
                                                    </Button>
                                                </VStack>
                                            </form>
                                        </Box>
                                    </Box>
                                )}

                                {/* ---------- CHAT VIEW ---------- */}
                                {view === 'chat' && (
                                    <ChatWindow
                                        compact
                                        conversation={activeConversation}
                                        messages={messages}
                                        currentUser={userInfo}
                                        loading={messagesLoading}
                                        onSend={(text) => sendMutation.mutate(text)}
                                        sending={sendMutation.isPending}
                                        onBack={() => { setView('list'); setSelectedId(null); }}
                                        roleLabel={t('you')}
                                    />
                                )}
                            </Box>
                        )}
                    </MotionBox>
                )}
            </AnimatePresence>
        </>
    );
};

export default SupportChat;
