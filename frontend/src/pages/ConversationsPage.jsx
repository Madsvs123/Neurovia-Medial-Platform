import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Container, Flex, Heading, Text, Button, VStack, Icon, Spinner, Input, Select,
    Textarea, IconButton, useColorModeValue, useToast, HStack, Badge, Alert, AlertIcon,
} from '@chakra-ui/react';
import { FiPlus, FiMessageCircle, FiChevronLeft, FiSend, FiHelpCircle } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { conversationApi } from '../services/api';
import { POLL_INTERVALS } from '../services/conversationApi';
import ConversationCard from '../components/Conversation/ConversationCard';
import ChatWindow from '../components/Conversation/ChatWindow';
import ConversationStatusBadge from '../components/Conversation/ConversationStatusBadge';
import {
    CATEGORY_LABELS, ACTIVE_STATUSES, RESOLVED_STATUSES, isOwnMessage, getCategoryLabel,
    getReplyBlockReason, getConversationPartner, getUserDisplayName, isStaffRole, conversationBasePath,
} from '../components/Conversation/conversationStatus';
import { t } from '../components/conversationText';

const FILTERS = [
    { key: 'all', label: t('all') },
    { key: 'active', label: t('active') },
    { key: 'resolved', label: t('resolved') },
];

/**
 * Student "Messages" page: /conversations and /conversations/:id.
 * This is the deep-link target for notifications and the Navbar entry.
 */
const ConversationsPage = () => {
    const { id: selectedId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { userInfo } = useSelector((state) => state.auth);
    const myId = userInfo?._id || userInfo?.id;

    const [filter, setFilter] = useState('all');
    const [composing, setComposing] = useState(false);
    const [formData, setFormData] = useState({ subject: '', category: 'general', message: '' });

    const panelBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    useEffect(() => {
        if (!userInfo) {
            navigate('/login', { replace: true, state: { from: { pathname: selectedId ? `/conversations/${selectedId}` : '/conversations' } } });
            return;
        }
        // Staff have their own inbox; also catches legacy notification links.
        if (isStaffRole(userInfo.role)) {
            const base = conversationBasePath(userInfo.role);
            navigate(selectedId ? `${base}/${selectedId}` : base, { replace: true });
        }
    }, [userInfo, navigate, selectedId]);

    const { data: conversations = [], isLoading } = useQuery({
        queryKey: ['my-conversations'],
        queryFn: async () => (await conversationApi.getMyConversations()).data,
        enabled: !!userInfo,
        refetchInterval: POLL_INTERVALS.conversations,
    });

    const activeConversation = useMemo(
        () => conversations.find(c => c._id === selectedId) || null,
        [conversations, selectedId]
    );

    // Deep links may point at a conversation the list does not (yet) contain
    const { data: directConversation, error: directError } = useQuery({
        queryKey: ['conversation', selectedId],
        queryFn: async () => (await conversationApi.getConversation(selectedId)).data,
        enabled: !!userInfo && !!selectedId && !activeConversation && !isLoading,
        retry: false,
    });
    const conversation = activeConversation || directConversation || null;

    const { data: messages = [], isLoading: messagesLoading } = useQuery({
        queryKey: ['conversation-messages', selectedId],
        queryFn: async () => (await conversationApi.getConversationMessages(selectedId)).data,
        enabled: !!userInfo && !!selectedId && !!conversation,
        refetchInterval: POLL_INTERVALS.messages,
    });

    // Per-reader read receipts
    useEffect(() => {
        if (!selectedId || !userInfo) return;
        const hasUnread = messages.some(m => !isOwnMessage(m, myId) && !(m.readBy || []).includes(String(myId)));
        if (!hasUnread) return;
        conversationApi.markConversationRead(selectedId)
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
                queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedId] });
            })
            .catch(() => { /* best-effort */ });
    }, [messages, selectedId, userInfo, myId, queryClient]);

    const createMutation = useMutation({
        mutationFn: (data) => conversationApi.createConversation(data),
        onSuccess: (response) => {
            toast({ title: t('conversationStarted'), description: t('supportWillRespond'), status: 'success', duration: 3000, isClosable: true });
            setFormData({ subject: '', category: 'general', message: '' });
            setComposing(false);
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
            navigate(`/conversations/${response.data._id}`);
        },
        onError: (error) => toast({ title: 'Error', description: error.response?.data?.message || 'Failed to start conversation', status: 'error', duration: 4000, isClosable: true }),
    });

    const sendMutation = useMutation({
        mutationFn: (text) => conversationApi.sendMessage(selectedId, { message: text }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedId] });
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['conversation', selectedId] });
        },
        onError: (error) => toast({ title: 'Error', description: error.response?.data?.message || 'Failed to send message', status: 'error', duration: 4000, isClosable: true }),
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!formData.subject.trim()) return toast({ title: t('pleaseEnterSubject'), status: 'warning', duration: 3000 });
        if (!formData.message.trim()) return toast({ title: t('pleaseEnterMessage'), status: 'warning', duration: 3000 });
        createMutation.mutate({ subject: formData.subject.trim(), category: formData.category, message: formData.message.trim() });
    };

    const filteredConversations = useMemo(() => {
        if (filter === 'active') return conversations.filter(c => ACTIVE_STATUSES.includes(c.status));
        if (filter === 'resolved') return conversations.filter(c => RESOLVED_STATUSES.includes(c.status));
        return conversations;
    }, [conversations, filter]);

    if (!userInfo) return null;

    const showListOnMobile = !selectedId && !composing;
    const blockReason = getReplyBlockReason(conversation, userInfo);
    const partner = conversation ? getConversationPartner(conversation, myId) : null;

    const listPanel = (
        <Box
            w={{ base: '100%', md: '360px' }} flexShrink={0}
            display={{ base: showListOnMobile ? 'flex' : 'none', md: 'flex' }}
            flexDirection="column" bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden"
        >
            <Box p={3} borderBottomWidth="1px" borderColor={borderColor}>
                <Button size="sm" colorScheme="teal" w="full" leftIcon={<FiPlus />} mb={2} borderRadius="lg"
                    onClick={() => { setComposing(true); navigate('/conversations'); }}>
                    {t('startNewChat')}
                </Button>
                <Flex gap={1} flexWrap="wrap">
                    {FILTERS.map(f => (
                        <Button key={f.key} size="xs" variant={filter === f.key ? 'solid' : 'ghost'} colorScheme={filter === f.key ? 'teal' : 'gray'} borderRadius="full" px={3} onClick={() => setFilter(f.key)}>
                            {f.label}
                        </Button>
                    ))}
                </Flex>
            </Box>
            <Box flex={1} minH={0} overflowY="auto" p={2}>
                {isLoading ? (
                    <Flex justify="center" py={8}><Spinner size="sm" thickness="3px" color="teal.500" /></Flex>
                ) : filteredConversations.length === 0 ? (
                    <VStack py={10} spacing={3}>
                        <Icon as={FiMessageCircle} boxSize={10} opacity={0.25} />
                        <Text fontSize="sm" color="gray.500" textAlign="center">{t('noConversations')}</Text>
                    </VStack>
                ) : (
                    <VStack spacing={2} align="stretch">
                        {filteredConversations.map(conv => (
                            <Box key={conv._id} borderRadius="lg" outline={conv._id === selectedId ? '2px solid' : 'none'} outlineColor="teal.400">
                                <ConversationCard conversation={conv} currentUserId={myId} compact onClick={(c) => { setComposing(false); navigate(`/conversations/${c._id}`); }} />
                            </Box>
                        ))}
                    </VStack>
                )}
            </Box>
        </Box>
    );

    const composerPanel = (
        <Box flex={1} minW={0} display="flex" flexDirection="column" bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
            <Flex p={3} borderBottomWidth="1px" borderColor={borderColor} align="center" gap={2}>
                <IconButton icon={<FiChevronLeft />} size="sm" variant="ghost" aria-label={t('back')} onClick={() => setComposing(false)} display={{ base: 'inline-flex', md: 'none' }} />
                <Text fontWeight="semibold">{t('newConversation')}</Text>
            </Flex>
            <Box p={5} overflowY="auto">
                <Text fontSize="sm" color="gray.500" mb={4}>{t('supportWillRespond')}</Text>
                <form onSubmit={handleCreate}>
                    <VStack spacing={3} align="stretch" maxW="560px">
                        <Input placeholder={`${t('subject')} *`} value={formData.subject} maxLength={200}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))} borderRadius="lg" />
                        <Select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} borderRadius="lg">
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </Select>
                        <Textarea placeholder={`${t('message')} *`} value={formData.message} rows={6} maxLength={5000}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} borderRadius="lg" />
                        <HStack justify="flex-end">
                            <Button variant="ghost" onClick={() => setComposing(false)}>{t('cancel')}</Button>
                            <Button type="submit" colorScheme="teal" isLoading={createMutation.isPending} rightIcon={<FiSend />} borderRadius="lg">
                                {t('startConversation')}
                            </Button>
                        </HStack>
                    </VStack>
                </form>
            </Box>
        </Box>
    );

    const chatPanel = (
        <Box flex={1} minW={0} minH={0} display="flex" flexDirection="column" bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
            {!selectedId ? (
                <Flex direction="column" align="center" justify="center" h="100%" color="gray.400" p={8}>
                    <Icon as={FiMessageCircle} boxSize={12} opacity={0.25} />
                    <Text mt={3} fontSize="sm">{t('selectConversation')}</Text>
                </Flex>
            ) : directError ? (
                <Box p={6}>
                    <Alert status="warning" borderRadius="lg"><AlertIcon />{directError.response?.data?.message || t('conversationNotFound')}</Alert>
                    <Button mt={4} size="sm" leftIcon={<FiChevronLeft />} onClick={() => navigate('/conversations')}>{t('back')}</Button>
                </Box>
            ) : !conversation ? (
                <Flex justify="center" align="center" h="100%"><Spinner size="md" thickness="3px" color="teal.500" /></Flex>
            ) : (
                <>
                    <Flex p={3} borderBottomWidth="1px" borderColor={borderColor} align="center" gap={2}>
                        <IconButton icon={<FiChevronLeft />} size="sm" variant="ghost" aria-label={t('back')} onClick={() => navigate('/conversations')} display={{ base: 'inline-flex', md: 'none' }} />
                        <Box flex={1} minW={0}>
                            <Text fontWeight="semibold" noOfLines={1}>{conversation.subject}</Text>
                            <HStack spacing={2} fontSize="xs" color="gray.500">
                                <Text>{getCategoryLabel(conversation.category)}</Text>
                                <Text>·</Text>
                                <Text noOfLines={1}>{partner ? `${t('supportTeam')}: ${getUserDisplayName(partner)}` : t('notYetAssigned')}</Text>
                            </HStack>
                        </Box>
                        <ConversationStatusBadge status={conversation.status} />
                    </Flex>
                    <Box flex={1} minH={0}>
                        <ChatWindow
                            conversation={conversation}
                            messages={messages}
                            currentUser={userInfo}
                            loading={messagesLoading}
                            onSend={(text) => sendMutation.mutate(text)}
                            sending={sendMutation.isPending}
                            roleLabel={t('you')}
                            disabled={!!blockReason}
                            disabledMessage={blockReason === 'closed' ? t('conversationClosedUser') : t('notAuthorizedConversation')}
                        />
                    </Box>
                </>
            )}
        </Box>
    );

    return (
        <Container maxW="1200px" py={8} h="calc(100vh - 80px)" display="flex" flexDirection="column">
            <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
                <Box>
                    <Heading size="lg">{t('messagesTitle')}</Heading>
                    <Text fontSize="sm" color="gray.500">{t('supportWillRespond')}</Text>
                </Box>
                <HStack>
                    {conversations.some(c => c.unreadCount > 0) && (
                        <Badge colorScheme="red" borderRadius="full" px={2}>
                            {conversations.reduce((s, c) => s + (Number(c.unreadCount) || 0), 0)} {t('new').toLowerCase()}
                        </Badge>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<FiHelpCircle />} onClick={() => navigate('/support')}>{t('support')}</Button>
                </HStack>
            </Flex>
            <Flex flex={1} minH={0} gap={4}>
                {listPanel}
                {composing ? composerPanel : chatPanel}
            </Flex>
        </Container>
    );
};

export default ConversationsPage;
