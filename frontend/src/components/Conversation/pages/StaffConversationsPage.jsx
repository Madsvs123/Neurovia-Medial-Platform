import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Flex, Heading, Text, Badge, Button, Input, Select,
    useColorModeValue, Spinner, Alert, AlertIcon, VStack, Icon,
    InputGroup, InputLeftElement, Tabs, TabList, TabPanels, Tab, TabPanel, useToast,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiMessageSquare, FiInbox } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConversationCard from '../ConversationCard';
import ConversationStats from '../ConversationStats';
import { STATUS_META, getConversationPartner, getUserDisplayName } from '../conversationStatus';
import { POLL_INTERVALS } from '../../../services/conversationApi';
import { t } from '../../conversationText';

const BASE_TABS = [
    { key: 'all', label: t('myConversations'), statuses: null },
    { key: 'needs-reply', label: t('needsReply'), statuses: ['pending-admin'], badgeScheme: 'orange' },
    { key: 'in-progress', label: t('inProgress'), statuses: ['in-progress', 'open'], badgeScheme: 'blue' },
    { key: 'waiting', label: t('waiting'), statuses: ['pending-user'], badgeScheme: 'purple' },
    { key: 'resolved', label: t('resolvedTab'), statuses: ['resolved', 'closed'], badgeScheme: 'green' },
    { key: 'queue', label: t('queue'), statuses: null, badgeScheme: 'teal' },
];
const ADMIN_TABS = [...BASE_TABS, { key: 'platform', label: t('allTickets'), statuses: null, badgeScheme: 'gray' }];

const matchesSearch = (conv, q) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    const partner = getConversationPartner(conv, null);
    const people = [partner, ...(conv.participants || []), conv.assignedTo].filter(Boolean);
    return (
        (conv.subject || '').toLowerCase().includes(needle) ||
        (conv.lastMessage?.text || '').toLowerCase().includes(needle) ||
        (conv.category || '').toLowerCase().includes(needle) ||
        people.some(p =>
            getUserDisplayName(p).toLowerCase().includes(needle) ||
            (p?.email || '').toLowerCase().includes(needle)
        )
    );
};

/**
 * Staff inbox shared by the admin and educator panels.
 *
 * Props:
 *  - api: bound conversation API (services/conversationApi.createConversationApi)
 *  - role: 'admin' | 'educator'
 *  - basePath: '/admin/conversations' | '/educator/conversations'
 *  - currentUser: the viewer
 *  - title: page heading
 */
const StaffConversationsPage = ({ api, role, basePath, currentUser, title }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isAdmin = role === 'admin';
    const myId = currentUser?._id || currentUser?.id;
    const TABS = isAdmin ? ADMIN_TABS : BASE_TABS;

    const [searchQuery, setSearchQuery] = useState('');
    const [tabIndex, setTabIndex] = useState(0);
    const [statusFilter, setStatusFilter] = useState('all');

    const bgColor = useColorModeValue('white', 'gray.800');

    const { data: conversations = [], isLoading, error } = useQuery({
        queryKey: ['my-conversations'],
        queryFn: async () => (await api.getMyConversations()).data,
        refetchInterval: POLL_INTERVALS.conversations,
    });

    const { data: queue = [], isLoading: queueLoading } = useQuery({
        queryKey: ['support-queue'],
        queryFn: async () => (await api.getSupportQueue()).data,
        refetchInterval: POLL_INTERVALS.queue,
    });

    // Admin-only: platform-wide list + stats for oversight
    const { data: platform = [], isLoading: platformLoading } = useQuery({
        queryKey: ['all-conversations'],
        queryFn: async () => (await api.getAllConversations()).data,
        enabled: isAdmin,
        refetchInterval: POLL_INTERVALS.conversations,
    });
    const { data: platformStats } = useQuery({
        queryKey: ['conversation-stats'],
        queryFn: async () => (await api.getConversationStats()).data,
        enabled: isAdmin,
        refetchInterval: POLL_INTERVALS.stats,
    });

    const invalidateLists = () => {
        queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['support-queue'] });
        queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['conversation-stats'] });
    };

    const deleteMutation = useMutation({
        mutationFn: (id) => api.deleteConversation(id),
        onSuccess: () => { toast({ title: t('delete'), status: 'success', duration: 2500 }); invalidateLists(); },
        onError: (err) => toast({ title: 'Error', description: err.response?.data?.message || err.message, status: 'error', duration: 4000 }),
    });

    const joinMutation = useMutation({
        mutationFn: (id) => api.joinConversation(id),
        onSuccess: (response) => {
            invalidateLists();
            navigate(`${basePath}/${response.data._id}`);
        },
        onError: (err) => {
            toast({ title: 'Could not join', description: err.response?.data?.message || err.message, status: 'warning', duration: 4000 });
            invalidateLists();
        },
    });

    const filtered = useMemo(() => conversations.filter(c =>
        (statusFilter === 'all' || c.status === statusFilter) && matchesSearch(c, searchQuery)
    ), [conversations, statusFilter, searchQuery]);

    const filteredQueue = useMemo(() => queue.filter(c => matchesSearch(c, searchQuery)), [queue, searchQuery]);

    const filteredPlatform = useMemo(() => platform.filter(c =>
        (statusFilter === 'all' || c.status === statusFilter) && matchesSearch(c, searchQuery)
    ), [platform, statusFilter, searchQuery]);

    const tabConversations = (tab) => (tab.statuses ? filtered.filter(c => tab.statuses.includes(c.status)) : filtered);

    const tabCount = (tab) => {
        if (tab.key === 'queue') return filteredQueue.length;
        if (tab.key === 'platform') return filteredPlatform.length;
        if (tab.statuses) return filtered.filter(c => tab.statuses.includes(c.status)).length;
        return filtered.length;
    };

    if (isLoading) return <Flex justify="center" py={16}><Spinner size="xl" thickness="3px" color="teal.500" /></Flex>;
    if (error) {
        return (
            <Alert status="error" borderRadius="lg">
                <AlertIcon />{error.response?.data?.message || error.message}
            </Alert>
        );
    }

    const openConversation = (conv) => navigate(`${basePath}/${conv._id}`);

    const renderList = (items, { isQueue = false, loading = false } = {}) => {
        if (loading) return <Flex justify="center" py={16}><Spinner size="lg" thickness="3px" color="teal.500" /></Flex>;
        if (items.length === 0) {
            return (
                <Flex direction="column" align="center" py={16}>
                    <Icon as={isQueue ? FiInbox : FiMessageSquare} boxSize={10} opacity={0.2} />
                    <Text mt={3} color="gray.500">{isQueue ? t('queueEmpty') : t('noConversations')}</Text>
                </Flex>
            );
        }
        return (
            <VStack spacing={2} align="stretch">
                {items.map(conv => (
                    <ConversationCard
                        key={conv._id}
                        conversation={conv}
                        currentUserId={myId}
                        onClick={isQueue ? undefined : openConversation}
                        onDelete={isAdmin && !isQueue ? (c) => deleteMutation.mutate(c._id) : undefined}
                        actions={isQueue ? (
                            <Button
                                size="sm" colorScheme="teal" borderRadius="lg"
                                isLoading={joinMutation.isPending && joinMutation.variables === conv._id}
                                onClick={(e) => { e.stopPropagation(); joinMutation.mutate(conv._id); }}
                            >
                                {t('join')}
                            </Button>
                        ) : null}
                    />
                ))}
            </VStack>
        );
    };

    return (
        <Box>
            <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
                <Heading size="lg">{title}</Heading>
                <Button leftIcon={<FiPlus />} colorScheme="teal" size="sm" onClick={() => navigate(`${basePath}/new`)}>
                    {t('newConversation')}
                </Button>
            </Flex>

            {isAdmin
                ? <ConversationStats stats={platformStats} conversations={conversations} subtitle={platformStats ? t('platformWide') : ''} />
                : <ConversationStats conversations={conversations} subtitle={t('myConversations')} />}

            {!isAdmin && (
                <Text fontSize="xs" color="gray.500" mb={4}>{t('educatorCategoriesHint')}</Text>
            )}

            <Flex gap={3} mb={4} flexWrap="wrap">
                <InputGroup maxW="360px">
                    <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
                    <Input
                        placeholder={t('searchConversations')} size="sm"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        bg={bgColor} borderRadius="lg"
                    />
                </InputGroup>
                <Select size="sm" maxW="160px" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} bg={bgColor} borderRadius="lg">
                    <option value="all">{t('allStatuses')}</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
            </Flex>

            <Tabs variant="soft-rounded" colorScheme="teal" index={tabIndex} onChange={setTabIndex}>
                <TabList mb={4} flexWrap="wrap" gap={1}>
                    {TABS.map((tab) => {
                        const count = tabCount(tab);
                        return (
                            <Tab key={tab.key} fontSize="sm" px={4} py={2}>
                                {tab.label}
                                {count > 0 && (
                                    <Badge ml={2} borderRadius="full" fontSize="10px" colorScheme={tab.badgeScheme || 'gray'}>{count}</Badge>
                                )}
                            </Tab>
                        );
                    })}
                </TabList>
                <TabPanels>
                    {TABS.map((tab) => (
                        <TabPanel key={tab.key} p={0}>
                            {tab.key === 'queue' && renderList(filteredQueue, { isQueue: true, loading: queueLoading })}
                            {tab.key === 'platform' && renderList(filteredPlatform, { loading: platformLoading })}
                            {tab.key !== 'queue' && tab.key !== 'platform' && renderList(tabConversations(tab))}
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Box>
    );
};

export default StaffConversationsPage;
