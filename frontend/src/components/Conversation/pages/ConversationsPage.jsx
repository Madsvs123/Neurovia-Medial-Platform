import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Flex, Heading, Text, Badge, Button, Input, Select,
    useColorModeValue, Spinner, Alert, AlertIcon, HStack,
    VStack, Icon, InputGroup, InputLeftElement,
    Tabs, TabList, TabPanels, Tab, TabPanel,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiMessageSquare, FiInbox, FiEye } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConversationCard from '../ConversationCard';
import ConversationStats from '../ConversationStats';
import { STATUS_META, getConversationPartner } from '../conversationStatus';
import { t } from '../../conversationText';
import { useConversationSocket } from '../useConversationSocket';

const TABS = [
    { key: 'all', label: t('all'), statuses: null },
    { key: 'needs-reply', label: t('needsReply'), statuses: ['pending-admin'], badgeScheme: 'orange' },
    { key: 'in-progress', label: t('inProgress'), statuses: ['in-progress', 'open'], badgeScheme: 'blue' },
    { key: 'waiting', label: t('waiting'), statuses: ['pending-user'], badgeScheme: 'purple' },
    { key: 'resolved', label: t('resolvedTab'), statuses: ['resolved', 'closed'], badgeScheme: 'green' },
    { key: 'queue', label: t('queue'), statuses: null, badgeScheme: 'teal' },
];

const matchesSearch = (conv, q) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    const partner = getConversationPartner(conv, null);
    return (
        (conv.subject || '').toLowerCase().includes(needle) ||
        (conv.lastMessage?.text || '').toLowerCase().includes(needle) ||
        (partner?.username || '').toLowerCase().includes(needle) ||
        (partner?.email || '').toLowerCase().includes(needle) ||
        (conv.participants || []).some(p =>
            (p?.username || '').toLowerCase().includes(needle) ||
            (p?.email || '').toLowerCase().includes(needle)
        )
    );
};

/**
 * Shared "staff inbox" page used by both the admin panel and the educator
 * panel (previously two ~220-line copies that only differed by route
 * prefix and heading text).
 *
 * Props:
 *  - api: the portal's bound conversation API (admin/services/api.js or
 *    educator/services/api.js — both built from the same factory)
 *  - basePath: '/admin/conversations' | '/educator/conversations'
 *  - heading: page title
 *  - currentUser: { _id|id, role }
 *  - showAllConversationsTab: admin-only platform-wide oversight tab
 */
const ConversationsPage = ({ api, basePath, heading, currentUser, showAllConversationsTab = false }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const myId = currentUser?._id || currentUser?.id;

    const [searchQuery, setSearchQuery] = useState('');
    const [tabIndex, setTabIndex] = useState(0);
    const [statusFilter, setStatusFilter] = useState('all');

    const bgColor = useColorModeValue('white', 'gray.800');

    useConversationSocket(!!currentUser);

    const tabs = showAllConversationsTab
        ? [...TABS, { key: 'platform-all', label: 'All Conversations', statuses: null, badgeScheme: 'gray' }]
        : TABS;

    // Assigned conversations (poll 30s — socket pushes updates instantly when connected)
    const { data: conversations = [], isLoading, error } = useQuery({
        queryKey: ['my-conversations'],
        queryFn: async () => (await api.getMyConversations()).data,
        refetchInterval: 30000,
    });

    // Unassigned support queue
    const { data: queue = [], isLoading: queueLoading } = useQuery({
        queryKey: ['support-queue'],
        queryFn: async () => (await api.getSupportQueue()).data,
        refetchInterval: 30000,
    });

    // Admin-only: every conversation on the platform, for oversight.
    const { data: allConversations = [], isLoading: allLoading } = useQuery({
        queryKey: ['all-conversations'],
        queryFn: async () => (await api.getAllConversations()).data,
        enabled: showAllConversationsTab,
        refetchInterval: 45000,
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.deleteConversation(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-conversations'] }),
    });

    const joinMutation = useMutation({
        mutationFn: (id) => api.joinConversation(id),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['support-queue'] });
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['all-conversations'] });
            navigate(`${basePath}/${response.data._id}`);
        },
    });

    const filtered = useMemo(() => {
        return conversations.filter(c => {
            const statusMatch = statusFilter === 'all' || c.status === statusFilter;
            return statusMatch && matchesSearch(c, searchQuery);
        });
    }, [conversations, statusFilter, searchQuery]);

    const filteredQueue = useMemo(
        () => queue.filter(c => matchesSearch(c, searchQuery)),
        [queue, searchQuery]
    );

    const filteredAll = useMemo(
        () => allConversations.filter(c => matchesSearch(c, searchQuery)),
        [allConversations, searchQuery]
    );

    const tabConversations = (tab) => {
        if (!tab.statuses) return filtered;
        return filtered.filter(c => tab.statuses.includes(c.status));
    };

    const counts = useMemo(() => {
        const byTab = TABS.map(tab => (tab.statuses ? filtered.filter(c => tab.statuses.includes(c.status)).length : null));
        return byTab;
    }, [filtered]);

    if (isLoading) return <Flex justify="center" py={16}><Spinner size="xl" thickness="3px" color="teal.500" /></Flex>;
    if (error) return <Alert status="error" borderRadius="lg"><AlertIcon />{error.message}</Alert>;

    const openConversation = (conv) => navigate(`${basePath}/${conv._id}`);

    // In the platform-wide view the viewer might not be a participant yet —
    // joining is required before the detail page's message fetch will succeed.
    const openOrJoin = (conv) => {
        const isParticipant = (conv.participants || []).some(
            p => String(p?._id || p) === String(myId)
        );
        if (isParticipant) {
            openConversation(conv);
        } else {
            joinMutation.mutate(conv._id);
        }
    };

    const renderList = (items, { isQueue = false, isPlatformAll = false, loading = false } = {}) => {
        if (loading) {
            return <Flex justify="center" py={16}><Spinner size="lg" thickness="3px" color="teal.500" /></Flex>;
        }
        if (items.length === 0) {
            return (
                <Flex direction="column" align="center" py={16}>
                    <Icon as={isQueue ? FiInbox : FiMessageSquare} boxSize={10} opacity={0.2} />
                    <Text mt={3} color="gray.500">
                        {isQueue ? t('queueEmpty') : t('noConversations')}
                    </Text>
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
                        onClick={isQueue ? undefined : (isPlatformAll ? openOrJoin : openConversation)}
                        onDelete={(isQueue || isPlatformAll) ? undefined : (c) => deleteMutation.mutate(c._id)}
                        actions={isQueue ? (
                            <Button
                                size="sm"
                                colorScheme="teal"
                                borderRadius="lg"
                                isLoading={joinMutation.isPending && joinMutation.variables === conv._id}
                                onClick={(e) => { e.stopPropagation(); joinMutation.mutate(conv._id); }}
                            >
                                {t('join')}
                            </Button>
                        ) : isPlatformAll ? (
                            <Button
                                size="sm"
                                variant="outline"
                                colorScheme="teal"
                                borderRadius="lg"
                                leftIcon={<FiEye />}
                                isLoading={joinMutation.isPending && joinMutation.variables === conv._id}
                                onClick={(e) => { e.stopPropagation(); openOrJoin(conv); }}
                            >
                                {(conv.participants || []).some(p => String(p?._id || p) === String(myId)) ? t('viewDetails') : t('join')}
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
                <Heading size="lg">{heading}</Heading>
                <Button
                    leftIcon={<FiPlus />} colorScheme="teal" size="sm"
                    onClick={() => navigate(`${basePath}/new`)}
                >
                    {t('newConversation')}
                </Button>
            </Flex>

            <ConversationStats conversations={conversations} />

            <Flex gap={3} mb={4} flexWrap="wrap">
                <InputGroup maxW="360px">
                    <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
                    <Input
                        placeholder={t('searchConversations')} size="sm"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        bg={bgColor} borderRadius="lg"
                    />
                </InputGroup>
                <Select
                    size="sm" maxW="160px" value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    bg={bgColor} borderRadius="lg"
                >
                    <option value="all">{t('allStatuses')}</option>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </Select>
            </Flex>

            <Tabs variant="soft-rounded" colorScheme="teal" index={tabIndex} onChange={setTabIndex}>
                <TabList mb={4} flexWrap="wrap" gap={1}>
                    {tabs.map((tab, i) => {
                        const count = tab.key === 'queue'
                            ? filteredQueue.length
                            : tab.key === 'platform-all' ? null : counts[i];
                        return (
                            <Tab key={tab.key} fontSize="sm" px={4} py={2}>
                                {tab.label}
                                {count > 0 && (
                                    <Badge ml={2} borderRadius="full" fontSize="10px" colorScheme={tab.badgeScheme || 'gray'}>
                                        {count}
                                    </Badge>
                                )}
                            </Tab>
                        );
                    })}
                </TabList>

                <TabPanels>
                    {tabs.map((tab) => (
                        <TabPanel key={tab.key} p={0}>
                            {tab.key === 'queue'
                                ? renderList(filteredQueue, { isQueue: true, loading: queueLoading })
                                : tab.key === 'platform-all'
                                    ? renderList(filteredAll, { isPlatformAll: true, loading: allLoading })
                                    : renderList(tabConversations(tab))}
                        </TabPanel>
                    ))}
                </TabPanels>
            </Tabs>
        </Box>
    );
};

export default ConversationsPage;
