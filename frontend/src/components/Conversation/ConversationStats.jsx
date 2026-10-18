import React, { useMemo } from 'react';
import {
    Box, Flex, SimpleGrid, Text, useColorModeValue,
} from '@chakra-ui/react';
import {
    FiMessageSquare, FiAlertCircle, FiActivity, FiCheckCircle, FiInbox,
} from 'react-icons/fi';
import { RESOLVED_STATUSES } from './conversationStatus';
import { t } from '../conversationText';

/**
 * Stat cards. Either computed from the viewer's own conversation list, or —
 * when `stats` (the payload of GET /api/conversations/stats) is supplied —
 * platform-wide figures for admins. No fabricated metrics.
 */
const ConversationStats = ({ conversations = [], stats: serverStats = null, subtitle = '' }) => {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const stats = useMemo(() => {
        if (serverStats) {
            return {
                total: serverStats.total || 0,
                needsReply: serverStats.needsReply || 0,
                inProgress: serverStats.inProgress || 0,
                resolved: serverStats.resolved || 0,
                unassigned: serverStats.unassigned,
            };
        }
        return {
            total: conversations.length,
            needsReply: conversations.filter(c => c.status === 'pending-admin').length,
            inProgress: conversations.filter(c => ['in-progress', 'open'].includes(c.status)).length,
            resolved: conversations.filter(c => RESOLVED_STATUSES.includes(c.status)).length,
        };
    }, [conversations, serverStats]);

    const cards = [
        { label: t('total'), value: stats.total, icon: FiMessageSquare, iconBg: 'gray.500' },
        { label: t('needsReply'), value: stats.needsReply, icon: FiAlertCircle, iconBg: 'orange.500' },
        { label: t('inProgress'), value: stats.inProgress, icon: FiActivity, iconBg: 'blue.500' },
        { label: t('resolved'), value: stats.resolved, icon: FiCheckCircle, iconBg: 'green.500' },
    ];
    if (typeof stats.unassigned === 'number') {
        cards.splice(1, 0, { label: t('unassigned'), value: stats.unassigned, icon: FiInbox, iconBg: 'teal.500' });
    }

    return (
        <Box mb={6}>
        {subtitle && <Text fontSize="xs" color="gray.500" mb={2}>{subtitle}</Text>}
        <SimpleGrid columns={{ base: 2, md: cards.length }} spacing={3}>
            {cards.map(({ label, value, icon: IconCmp, iconBg }) => (
                <Box
                    key={label}
                    bg={cardBg}
                    p={4}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={borderColor}
                    boxShadow="sm"
                >
                    <Flex align="center" gap={3}>
                        <Box bg={iconBg} p={2.5} borderRadius="lg" color="white" flexShrink={0}>
                            <IconCmp size={18} />
                        </Box>
                        <Box minW={0}>
                            <Text fontSize="xs" color="gray.500" noOfLines={1}>{label}</Text>
                            <Text fontSize="2xl" fontWeight="bold" lineHeight="shorter">{value}</Text>
                        </Box>
                    </Flex>
                </Box>
            ))}
        </SimpleGrid>
        </Box>
    );
};

export default ConversationStats;
