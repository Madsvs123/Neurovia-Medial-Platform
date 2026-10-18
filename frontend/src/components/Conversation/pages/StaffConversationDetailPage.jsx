import React, { useEffect, useMemo } from 'react';
import {
    Box, Flex, Heading, Text, Avatar, Button, Badge, IconButton,
    Spinner, Alert, AlertIcon, AlertTitle, AlertDescription, useToast, HStack, VStack, Divider,
    Icon, useColorModeValue, Tooltip,
} from '@chakra-ui/react';
import {
    FiArrowLeft, FiCheckCircle, FiEdit, FiUserCheck, FiMail, FiUser, FiLock, FiLogIn, FiUserPlus,
} from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ChatWindow from '../ChatWindow';
import ConversationStatusBadge from '../ConversationStatusBadge';
import {
    getConversationPartner, getUserDisplayName, getRoleLabel, getCategoryLabel,
    isOwnMessage, RESOLVED_STATUSES, getReplyBlockReason,
} from '../conversationStatus';
import { POLL_INTERVALS } from '../../../services/conversationApi';
import { t } from '../../conversationText';

dayjs.extend(relativeTime);

/**
 * Staff conversation view shared by the admin and educator panels.
 *
 * Props: api, role ('admin' | 'educator'), basePath, currentUser
 */
const StaffConversationDetailPage = ({ api, role, basePath, currentUser }) => {
    const { id: conversationId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isAdmin = role === 'admin';
    const myId = currentUser?._id || currentUser?.id;

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const { data: conversation, isLoading: convLoading, error: convError } = useQuery({
        queryKey: ['conversation', conversationId],
        queryFn: async () => (await api.getConversation(conversationId)).data,
        enabled: !!conversationId,
        retry: (count, err) => ![403, 404].includes(err?.response?.status) && count < 2,
    });

    const canLoadMessages = !!conversation;
    const { data: messages = [], isLoading: msgLoading } = useQuery({
        queryKey: ['conversation-messages', conversationId],
        queryFn: async () => (await api.getConversationMessages(conversationId)).data,
        enabled: canLoadMessages,
        refetchInterval: POLL_INTERVALS.messages,
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['support-queue'] });
        queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['conversation-stats'] });
    };

    // Mark incoming messages as read for *this* viewer (per-reader receipts)
    const hasUnread = useMemo(
        () => messages.some(m => !isOwnMessage(m, myId) && !(m.readBy || []).includes(String(myId))),
        [messages, myId]
    );
    useEffect(() => {
        if (!conversationId || !hasUnread) return;
        api.markConversationRead(conversationId)
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
                queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
            })
            .catch(() => { /* best-effort */ });
    }, [api, conversationId, hasUnread, queryClient]);

    const errorToast = (title) => (err) => toast({
        title, description: err.response?.data?.message || err.message, status: 'error', duration: 5000, isClosable: true,
    });

    const sendMutation = useMutation({
        mutationFn: (text) => api.sendMessage(conversationId, { message: text }),
        onSuccess: invalidateAll,
        onError: errorToast('Error sending'),
    });

    const statusMutation = useMutation({
        mutationFn: (status) => api.updateConversationStatus(conversationId, status),
        onSuccess: () => { invalidateAll(); toast({ title: t('statusUpdated'), status: 'success', duration: 3000, isClosable: true }); },
        onError: errorToast('Failed to update status'),
    });

    const joinMutation = useMutation({
        mutationFn: () => api.joinConversation(conversationId),
        onSuccess: () => { invalidateAll(); toast({ title: t('joined'), status: 'success', duration: 3000 }); },
        onError: errorToast('Could not join'),
    });

    if (convLoading) {
        return <Flex justify="center" align="center" h="500px"><Spinner size="xl" thickness="3px" color="teal.500" /></Flex>;
    }
    if (convError) {
        const status = convError.response?.status;
        return (
            <Alert status={status === 403 ? 'warning' : 'error'} borderRadius="lg" flexDirection="column" alignItems="flex-start" gap={2}>
                <HStack><AlertIcon /><AlertTitle>{status === 403 ? t('notAuthorizedConversation') : t('conversationNotFound')}</AlertTitle></HStack>
                <AlertDescription>{convError.response?.data?.message || convError.message}</AlertDescription>
                <Button size="sm" leftIcon={<FiArrowLeft />} onClick={() => navigate(basePath)}>{t('back')}</Button>
            </Alert>
        );
    }
    if (!conversation) {
        return <Alert status="warning" borderRadius="lg"><AlertIcon />{t('conversationNotFound')}</Alert>;
    }

    const status = conversation.status;
    const isResolved = RESOLVED_STATUSES.includes(status);
    const isClosed = status === 'closed';
    const canTakeInProgress = ['open', 'pending-admin'].includes(status);
    const blockReason = getReplyBlockReason(conversation, currentUser);

    const partner = getConversationPartner(conversation, myId) || (conversation.participants || [])[0] || null;
    const partnerName = partner ? getUserDisplayName(partner) : null;
    const assignee = conversation.assignedTo && typeof conversation.assignedTo === 'object' ? conversation.assignedTo : null;

    const disabledMessage = blockReason === 'closed' ? t('conversationClosed') : blockReason === 'join' ? t('joinToReply') : '';
    const disabledAction = blockReason === 'join' ? (
        <Button size="sm" colorScheme="teal" leftIcon={<FiLogIn />} onClick={() => joinMutation.mutate()} isLoading={joinMutation.isPending}>
            {t('joinConversation')}
        </Button>
    ) : blockReason === 'closed' ? (
        <Button size="sm" colorScheme="orange" variant="outline" leftIcon={<FiEdit />} onClick={() => statusMutation.mutate('pending-admin')} isLoading={statusMutation.isPending}>
            {t('reopen')}
        </Button>
    ) : null;

    return (
        <Box h="calc(100vh - 120px)" display="flex" flexDirection="column">
            {/* Header */}
            <Flex align="center" gap={3} mb={4} flexWrap="wrap">
                <IconButton icon={<FiArrowLeft />} aria-label={t('back')} variant="ghost" onClick={() => navigate(basePath)} />
                <Box flex={1} minW={0}>
                    <Flex align="center" gap={2} flexWrap="wrap">
                        <Heading size="lg" noOfLines={1}>{conversation.subject}</Heading>
                        <Badge colorScheme="teal" variant="subtle" fontSize="xs" px={2} py={0.5} borderRadius="full">
                            {getCategoryLabel(conversation.category)}
                        </Badge>
                        <ConversationStatusBadge status={status} />
                        {!conversation.isParticipant && (
                            <Badge colorScheme="gray" variant="outline" fontSize="xs" px={2} py={0.5} borderRadius="full">
                                <Icon as={FiLock} boxSize={3} mr={1} verticalAlign="middle" />{t('viewOnly')}
                            </Badge>
                        )}
                    </Flex>
                    <Text fontSize="sm" color="gray.500">
                        {t('created')} {dayjs(conversation.createdAt).format('MMM D, YYYY h:mm A')}
                        {conversation.messageCount ? ` · ${conversation.messageCount} ${t('messages').toLowerCase()}` : ''}
                    </Text>
                </Box>
                <HStack spacing={2}>
                    {!conversation.isParticipant && (
                        <Button leftIcon={<FiUserPlus />} colorScheme="teal" size="sm" onClick={() => joinMutation.mutate()} isLoading={joinMutation.isPending}>
                            {t('join')}
                        </Button>
                    )}
                    {isResolved ? (
                        <Button leftIcon={<FiEdit />} colorScheme="orange" variant="outline" size="sm"
                            onClick={() => statusMutation.mutate('pending-admin')} isLoading={statusMutation.isPending}>
                            {t('reopen')}
                        </Button>
                    ) : (
                        <>
                            {canTakeInProgress && (isAdmin || conversation.isParticipant) && (
                                <Button leftIcon={<FiUserCheck />} colorScheme="blue" variant="outline" size="sm"
                                    onClick={() => statusMutation.mutate('in-progress')} isLoading={statusMutation.isPending}>
                                    {t('takeInProgress')}
                                </Button>
                            )}
                            {(isAdmin || conversation.isParticipant) && (
                                <Button leftIcon={<FiCheckCircle />} colorScheme="green" size="sm"
                                    onClick={() => statusMutation.mutate('resolved')} isLoading={statusMutation.isPending}>
                                    {t('resolve')}
                                </Button>
                            )}
                        </>
                    )}
                    {isAdmin && !isClosed && (
                        <Tooltip label={t('closeConversationHint')} hasArrow>
                            <Button leftIcon={<FiLock />} colorScheme="gray" variant="outline" size="sm"
                                onClick={() => statusMutation.mutate('closed')} isLoading={statusMutation.isPending}>
                                {t('closeConversation')}
                            </Button>
                        </Tooltip>
                    )}
                </HStack>
            </Flex>

            {/* Main: chat + sidebar */}
            <Flex flex={1} minH={0} gap={4}>
                <Box flex={1} minW={0} minH={0} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm" overflow="hidden">
                    <ChatWindow
                        conversation={conversation}
                        messages={messages}
                        currentUser={currentUser}
                        loading={msgLoading}
                        onSend={(text) => sendMutation.mutate(text)}
                        sending={sendMutation.isPending}
                        onQuickReply={(text) => sendMutation.mutate(text)}
                        quickReplyRole={role}
                        roleLabel={isAdmin ? t('youAdmin') : t('youEducator')}
                        disabled={!!blockReason}
                        disabledMessage={disabledMessage}
                        disabledAction={disabledAction}
                    />
                </Box>

                <Box w="300px" flexShrink={0} minH={0} overflowY="auto" display={{ base: 'none', lg: 'block' }}
                    sx={{ '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bg: 'gray.300', borderRadius: 'full' } }}>
                    <VStack spacing={4} align="stretch">
                        {/* Participant card */}
                        <Box bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm" p={4}>
                            <Text fontWeight="bold" fontSize="sm" mb={3}>{t('userInfo')}</Text>
                            {partnerName ? (
                                <VStack spacing={3} align="stretch">
                                    <Flex align="center" gap={3}>
                                        <Avatar name={partnerName} src={partner?.avatar || undefined} size="md" bg="teal.500" icon={<FiUser />} />
                                        <Box minW={0}>
                                            <Text fontWeight="semibold" noOfLines={1}>{partnerName}</Text>
                                            <Badge colorScheme="teal" variant="subtle" fontSize="xs">{getRoleLabel(partner?.role)}</Badge>
                                        </Box>
                                    </Flex>
                                    <Divider />
                                    <VStack spacing={2} align="stretch" fontSize="sm">
                                        <Flex align="center" gap={2} minW={0}>
                                            <Icon as={FiMail} boxSize={3.5} color="gray.400" flexShrink={0} />
                                            <Text color="gray.600" noOfLines={1}>{partner?.email || '—'}</Text>
                                        </Flex>
                                        {partner?.status && (
                                            <Flex align="center" gap={2}>
                                                <Icon as={FiCheckCircle} boxSize={3.5} color="gray.400" flexShrink={0} />
                                                <Badge colorScheme={partner.status === 'active' ? 'green' : partner.status === 'suspended' ? 'red' : 'yellow'} fontSize="xs">
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
                                <Flex justify="space-between"><Text color="gray.500">{t('status')}</Text><ConversationStatusBadge status={status} /></Flex>
                                <Flex justify="space-between"><Text color="gray.500">{t('category')}</Text><Text fontWeight="medium">{getCategoryLabel(conversation.category)}</Text></Flex>
                                <Flex justify="space-between" align="center">
                                    <Text color="gray.500">{t('assignedTo')}</Text>
                                    {assignee ? (
                                        <Badge colorScheme={conversation.isAssignedToMe ? 'teal' : 'gray'} variant="subtle" textTransform="none">
                                            {conversation.isAssignedToMe ? t('you') : getUserDisplayName(assignee)}
                                        </Badge>
                                    ) : (
                                        <Badge colorScheme="orange" variant="subtle" textTransform="none">{t('unassigned')}</Badge>
                                    )}
                                </Flex>
                                <Flex justify="space-between"><Text color="gray.500">{t('messages')}</Text><Text fontWeight="medium">{conversation.messageCount || 0}</Text></Flex>
                                <Flex justify="space-between" align="flex-start">
                                    <Text color="gray.500">{t('participant')}s</Text>
                                    <VStack spacing={0} align="flex-end">
                                        {(conversation.participants || []).map(p => (
                                            <Text key={p._id} fontSize="xs" noOfLines={1}>
                                                {getUserDisplayName(p)} <Text as="span" color="gray.400">· {getRoleLabel(p.role)}</Text>
                                            </Text>
                                        ))}
                                    </VStack>
                                </Flex>
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

export default StaffConversationDetailPage;
