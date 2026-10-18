import React, { useEffect, useMemo } from 'react';
import {
    Box, Flex, Heading, Text, Avatar, Button, Badge, IconButton,
    Spinner, Alert, AlertIcon, useToast, HStack, VStack, Divider,
    Icon, useColorModeValue,
} from '@chakra-ui/react';
import {
    FiArrowLeft, FiCheckCircle, FiEdit, FiUserCheck, FiMail, FiUser,
} from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChatWindow from '../ChatWindow';
import ConversationStatusBadge from '../ConversationStatusBadge';
import {
    getConversationPartner, getUserDisplayName, getRoleLabel,
    getCategoryLabel, isOwnMessage, RESOLVED_STATUSES,
} from '../conversationStatus';
import { t } from '../../conversationText';
import { useConversationSocket } from '../useConversationSocket';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Shared conversation detail page used by both the admin panel and the
 * educator panel (previously two ~290-line copies differing only by route
 * prefix and the "You (Admin)"/"You (Educator)" label).
 *
 * Props:
 *  - api: the portal's bound conversation API
 *  - basePath: '/admin/conversations' | '/educator/conversations'
 *  - currentUser: { _id|id, role, username, ... }
 *  - roleLabel: t('youAdmin') | t('youEducator')
 */
const ConversationDetailPage = ({ api, basePath, currentUser, roleLabel }) => {
    const { id: conversationId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const myId = currentUser?._id || currentUser?.id;

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    useConversationSocket(!!currentUser);

    // ─── Conversation ───
    const { data: conversation, isLoading: convLoading, error: convError } = useQuery({
        queryKey: ['conversation', conversationId],
        queryFn: async () => (await api.getConversation(conversationId)).data,
        enabled: !!conversationId,
    });

    // ─── Messages (poll 20s — socket pushes updates instantly when connected) ───
    const { data: messages = [], isLoading: msgLoading } = useQuery({
        queryKey: ['conversation-messages', conversationId],
        queryFn: async () => (await api.getConversationMessages(conversationId)).data,
        enabled: !!conversationId,
        refetchInterval: 20000,
    });

    // ─── Mark incoming messages as read (on mount + new arrivals) ───
    const hasUnread = useMemo(
        () => messages.some(m => !m.read && !isOwnMessage(m, myId)),
        [messages, myId]
    );
    useEffect(() => {
        if (!conversationId || !hasUnread) return;
        api.markConversationRead(conversationId)
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
                queryClient.invalidateQueries({ queryKey: ['support-queue'] });
                queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
            })
            .catch(() => { /* best-effort */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, hasUnread, queryClient]);

    // ─── Send message ───
    const sendMutation = useMutation({
        mutationFn: (text) => api.sendMessage(conversationId, { message: text }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
        },
        onError: (err) => {
            toast({
                title: 'Error sending',
                description: err.response?.data?.message || err.message,
                status: 'error', duration: 5000, isClosable: true,
            });
        },
    });

    // ─── Status update ───
    const statusMutation = useMutation({
        mutationFn: (status) => api.updateConversationStatus(conversationId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
            toast({ title: 'Status updated', status: 'success', duration: 3000, isClosable: true });
        },
        onError: (err) => {
            toast({
                title: 'Failed to update status',
                description: err.response?.data?.message || err.message,
                status: 'error', duration: 4000, isClosable: true,
            });
        },
    });

    if (convLoading) {
        return <Flex justify="center" align="center" h="500px"><Spinner size="xl" thickness="3px" color="teal.500" /></Flex>;
    }
    if (convError) {
        return <Alert status="error" borderRadius="lg"><AlertIcon />{convError.response?.data?.message || convError.message}</Alert>;
    }
    if (!conversation) {
        return <Alert status="warning" borderRadius="lg"><AlertIcon />{t('conversationNotFound')}</Alert>;
    }

    const status = conversation.status;
    const isResolved = RESOLVED_STATUSES.includes(status);
    const isClosed = status === 'closed';
    const canTakeInProgress = ['open', 'pending-admin'].includes(status);

    // Null-safe partner: otherParticipant from the API, else first non-self
    // participant (creator for a pre-join solo conversation).
    const partner = getConversationPartner(conversation, myId)
        || (conversation.participants || [])[0]
        || null;
    const partnerName = partner ? getUserDisplayName(partner) : null;
    const isUnassigned = !conversation.otherParticipant;

    return (
        <Box h="calc(100vh - 120px)" display="flex" flexDirection="column">
            {/* ─── Header ─── */}
            <Flex align="center" gap={3} mb={4} flexWrap="wrap">
                <IconButton
                    icon={<FiArrowLeft />} aria-label={t('back')} variant="ghost"
                    onClick={() => navigate(basePath)}
                />
                <Box flex={1} minW={0}>
                    <Flex align="center" gap={2} flexWrap="wrap">
                        <Heading size="lg" noOfLines={1}>{conversation.subject}</Heading>
                        <Badge colorScheme="teal" variant="subtle" fontSize="xs" px={2} py={0.5} borderRadius="full">
                            {getCategoryLabel(conversation.category)}
                        </Badge>
                        <ConversationStatusBadge status={status} />
                    </Flex>
                    <Text fontSize="sm" color="gray.500">
                        {t('created')} {dayjs(conversation.createdAt).format('MMM D, YYYY h:mm A')}
                        {conversation.messageCount ? ` · ${conversation.messageCount} ${t('messages').toLowerCase()}` : ''}
                    </Text>
                </Box>
                <HStack spacing={2}>
                    {isResolved ? (
                        <Button
                            leftIcon={<FiEdit />} colorScheme="orange" variant="outline" size="sm"
                            onClick={() => statusMutation.mutate('pending-admin')}
                            isLoading={statusMutation.isPending}
                        >
                            {t('reopen')}
                        </Button>
                    ) : (
                        <>
                            {canTakeInProgress && (
                                <Button
                                    leftIcon={<FiUserCheck />} colorScheme="blue" variant="outline" size="sm"
                                    onClick={() => statusMutation.mutate('in-progress')}
                                    isLoading={statusMutation.isPending}
                                >
                                    {t('takeInProgress')}
                                </Button>
                            )}
                            <Button
                                leftIcon={<FiCheckCircle />} colorScheme="green" size="sm"
                                onClick={() => statusMutation.mutate('resolved')}
                                isLoading={statusMutation.isPending}
                            >
                                {t('resolve')}
                            </Button>
                        </>
                    )}
                </HStack>
            </Flex>

            {/* ─── Main: chat + sidebar ─── */}
            <Flex flex={1} minH={0} gap={4}>
                {/* Chat panel */}
                <Box
                    flex={1} minW={0} minH={0}
                    bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                    boxShadow="sm" overflow="hidden"
                >
                    <ChatWindow
                        conversation={conversation}
                        messages={messages}
                        currentUser={currentUser}
                        loading={msgLoading}
                        onSend={(text) => sendMutation.mutate(text)}
                        sending={sendMutation.isPending}
                        onQuickReply={(text) => sendMutation.mutate(text)}
                        roleLabel={roleLabel}
                        locked={isClosed}
                        lockedMessage={t('resolvedAndClosed')}
                        onReopen={isClosed ? () => statusMutation.mutate('pending-admin') : null}
                    />
                </Box>

                {/* Sidebar */}
                <Box
                    w="300px" flexShrink={0} minH={0} overflowY="auto"
                    display={{ base: 'none', lg: 'block' }}
                    sx={{
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { bg: 'gray.300', borderRadius: 'full' },
                    }}
                >
                    <VStack spacing={4} align="stretch">
                        {/* Participant card */}
                        <Box bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm" p={4}>
                            <Text fontWeight="bold" fontSize="sm" mb={3}>{t('userInfo')}</Text>
                            {partnerName ? (
                                <VStack spacing={3} align="stretch">
                                    <Flex align="center" gap={3}>
                                        <Avatar name={partnerName} size="md" bg="teal.500" icon={<FiUser />} />
                                        <Box minW={0}>
                                            <Text fontWeight="semibold" noOfLines={1}>{partnerName}</Text>
                                            <Badge colorScheme="teal" variant="subtle" fontSize="xs">
                                                {getRoleLabel(partner?.role)}
                                            </Badge>
                                        </Box>
                                    </Flex>
                                    {isUnassigned && (
                                        <Badge colorScheme="orange" variant="subtle" fontSize="xs" alignSelf="flex-start">
                                            {t('notYetAssigned')}
                                        </Badge>
                                    )}
                                    <Divider />
                                    <VStack spacing={2} align="stretch" fontSize="sm">
                                        <Flex align="center" gap={2} minW={0}>
                                            <Icon as={FiMail} boxSize={3.5} color="gray.400" flexShrink={0} />
                                            <Text color="gray.600" noOfLines={1}>{partner?.email || '—'}</Text>
                                        </Flex>
                                        <Flex align="center" gap={2}>
                                            <Icon as={FiUser} boxSize={3.5} color="gray.400" flexShrink={0} />
                                            <Text color="gray.600">{getRoleLabel(partner?.role)}</Text>
                                        </Flex>
                                        {partner?.status && (
                                            <Flex align="center" gap={2}>
                                                <Icon as={FiCheckCircle} boxSize={3.5} color="gray.400" flexShrink={0} />
                                                <Badge
                                                    colorScheme={partner.status === 'active' ? 'green' : partner.status === 'suspended' ? 'red' : 'yellow'}
                                                    fontSize="xs"
                                                >
                                                    {getRoleLabel(partner.status)}
                                                </Badge>
                                            </Flex>
                                        )}
                                    </VStack>
                                </VStack>
                            ) : (
                                <Text fontSize="sm" color="gray.500">{t('notYetAssigned')}</Text>
                            )}
                        </Box>

                        {/* Conversation meta */}
                        <Box bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm" p={4}>
                            <Text fontWeight="bold" fontSize="sm" mb={3}>{t('conversationMeta')}</Text>
                            <VStack spacing={2} align="stretch" fontSize="sm">
                                <Flex justify="space-between">
                                    <Text color="gray.500">{t('status')}</Text>
                                    <ConversationStatusBadge status={status} />
                                </Flex>
                                <Flex justify="space-between">
                                    <Text color="gray.500">{t('category')}</Text>
                                    <Text fontWeight="medium">{getCategoryLabel(conversation.category)}</Text>
                                </Flex>
                                <Flex justify="space-between">
                                    <Text color="gray.500">{t('messages')}</Text>
                                    <Text fontWeight="medium">{conversation.messageCount || 0}</Text>
                                </Flex>
                                {conversation.assignedTo && (
                                    <Flex justify="space-between">
                                        <Text color="gray.500">Assigned to</Text>
                                        <Text fontWeight="medium">{getUserDisplayName(conversation.assignedTo)}</Text>
                                    </Flex>
                                )}
                            </VStack>

                            <Divider my={3} />

                            <VStack spacing={1} align="stretch" fontSize="xs" color="gray.500">
                                <Text>{t('created')}: {dayjs(conversation.createdAt).format('MMM D, YYYY h:mm A')}</Text>
                                <Text>{t('lastActivity')}: {dayjs(conversation.lastMessageAt || conversation.updatedAt).fromNow()}</Text>
                                {conversation.resolvedAt && (
                                    <Text>{t('resolvedAt')}: {dayjs(conversation.resolvedAt).format('MMM D, YYYY h:mm A')}</Text>
                                )}
                            </VStack>
                        </Box>
                    </VStack>
                </Box>
            </Flex>
        </Box>
    );
};

export default ConversationDetailPage;
