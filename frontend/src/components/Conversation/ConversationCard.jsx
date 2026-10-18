import React from 'react';
import {
    Box, Flex, HStack, Text, Avatar, Badge, IconButton, Tooltip,
    useColorModeValue,
} from '@chakra-ui/react';
import { FiTrash2, FiUser } from 'react-icons/fi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ConversationStatusBadge from './ConversationStatusBadge';
import {
    getConversationPartner, getUserDisplayName, getRoleLabel, RESOLVED_STATUSES,
} from './conversationStatus';
import { t } from '../conversationText';

dayjs.extend(relativeTime);

/**
 * Shared conversation list row used by the student widget, the admin panel
 * and the educator panel.
 *
 * Props:
 *  - conversation: enriched conversation (unreadCount, otherParticipant)
 *  - currentUserId: id of the viewer (to resolve the other participant)
 *  - onClick(conversation): row click (usually navigate / open chat)
 *  - onDelete(conversation): optional — shows a delete icon-button with confirm
 *  - actions: optional React node rendered on the right (e.g. a Join button)
 *  - compact: tighter layout for the floating widget
 */
const ConversationCard = ({
    conversation,
    currentUserId,
    onClick,
    onDelete,
    actions = null,
    compact = false,
}) => {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const hoverBg = useColorModeValue('gray.50', 'gray.700');

    const partner = getConversationPartner(conversation, currentUserId);
    const partnerName = partner ? getUserDisplayName(partner) : t('supportRequest');
    const assignee = conversation.assignedTo && typeof conversation.assignedTo === 'object' ? conversation.assignedTo : null;
    const assigneeLabel = conversation.isAssignedToMe
        ? t('assignedToYou')
        : assignee ? `${t('assignedTo')} ${getUserDisplayName(assignee)}` : null;
    const unread = Number(conversation.unreadCount) || 0;
    const isResolved = RESOLVED_STATUSES.includes(conversation.status);
    const lastActivity = conversation.lastMessageAt || conversation.createdAt;
    const preview = (conversation.lastMessage?.text || '').trim();

    const handleDelete = (e) => {
        e.stopPropagation();
        if (!onDelete) return;
        if (window.confirm(t('deleteConversationConfirm'))) {
            onDelete(conversation);
        }
    };

    return (
        <Box
            bg={cardBg}
            p={compact ? 3 : 4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={borderColor}
            boxShadow="sm"
            cursor={onClick ? 'pointer' : 'default'}
            onClick={onClick ? () => onClick(conversation) : undefined}
            _hover={onClick ? { borderColor: 'teal.300', bg: hoverBg } : undefined}
            transition="all 0.15s"
            opacity={isResolved ? 0.75 : 1}
        >
            <Flex justify="space-between" align="flex-start" gap={3}>
                <HStack spacing={3} flex={1} minW={0}>
                    {!compact && (
                        <Avatar
                            name={partner ? partnerName : undefined}
                            size="md"
                            bg="teal.500"
                            icon={<FiUser />}
                            flexShrink={0}
                        />
                    )}
                    <Box flex={1} minW={0}>
                        <Flex align="center" gap={2} mb={0.5}>
                            <Text
                                fontWeight={unread > 0 ? 'bold' : 'semibold'}
                                fontSize="sm"
                                noOfLines={1}
                                flex={1}
                                minW={0}
                            >
                                {conversation.subject || t('noSubject')}
                            </Text>
                            <ConversationStatusBadge status={conversation.status} fontSize="9px" />
                        </Flex>

                        <Text fontSize="xs" color="gray.500" noOfLines={1} mb={1}>
                            {preview || t('noMessagesYet')}
                        </Text>

                        <Flex align="center" gap={2} flexWrap="wrap">
                            <Text fontSize="xs" color="gray.400" noOfLines={1}>
                                {partnerName}
                                {partner?.role ? ` · ${getRoleLabel(partner.role)}` : ''}
                            </Text>
                            {lastActivity && (
                                <Text fontSize="xs" color="gray.400" flexShrink={0}>
                                    {dayjs(lastActivity).fromNow()}
                                </Text>
                            )}
                            {assigneeLabel && !compact && (
                                <Badge colorScheme={conversation.isAssignedToMe ? 'teal' : 'gray'} variant="subtle" fontSize="2xs" textTransform="none">
                                    {assigneeLabel}
                                </Badge>
                            )}
                        </Flex>
                    </Box>
                </HStack>

                <HStack spacing={1} flexShrink={0} align="center">
                    {unread > 0 && (
                        <Badge colorScheme="teal" borderRadius="full" fontSize="xs" px={2}>
                            {unread > 99 ? '99+' : unread}
                        </Badge>
                    )}
                    {actions}
                    {onDelete && (
                        <Tooltip label={t('delete')} hasArrow>
                            <IconButton
                                icon={<FiTrash2 />}
                                size={compact ? 'xs' : 'sm'}
                                variant="ghost"
                                colorScheme="red"
                                aria-label={t('delete')}
                                onClick={handleDelete}
                            />
                        </Tooltip>
                    )}
                </HStack>
            </Flex>
        </Box>
    );
};

export default ConversationCard;
