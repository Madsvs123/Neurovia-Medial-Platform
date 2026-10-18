import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
    Box, Flex, Text, Badge, IconButton, Icon, Textarea, Spinner,
    HStack, Tooltip, useColorModeValue,
} from '@chakra-ui/react';
import {
    FiSend, FiCheck, FiChevronLeft, FiMessageCircle, FiChevronDown,
} from 'react-icons/fi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import ConversationStatusBadge from './ConversationStatusBadge';
import QuickReply from './QuickReply';
import { isOwnMessage, getRoleLabel } from './conversationStatus';
import { t } from '../conversationText';

dayjs.extend(relativeTime);
dayjs.extend(calendar);

const roleTagColor = (role) => {
    switch (role) {
        case 'admin': return 'red';
        case 'educator': return 'purple';
        default: return 'blue';
    }
};

const ReadTicks = ({ read }) => (
    <Tooltip label={read ? t('read') : t('sent')} hasArrow>
        <Flex as="span" align="center" ml={1}>
            <Icon
                as={FiCheck}
                boxSize={3}
                color={read ? 'white' : 'whiteAlpha.700'}
            />
            {read && (
                <Icon as={FiCheck} boxSize={3} color="white" ml="-8px" />
            )}
        </Flex>
    </Tooltip>
);

const MessageBubble = ({ msg, isOwn, showSender }) => {
    const otherBg = useColorModeValue('white', 'gray.800');
    const otherBorder = useColorModeValue('gray.200', 'gray.600');

    const senderName = msg.sender?.username || (msg.senderRole === 'student' ? t('user') : t('supportTeam'));

    return (
        <Flex justify={isOwn ? 'flex-end' : 'flex-start'} mb={showSender ? 3 : 1}>
            <Box maxWidth="78%">
                <Box
                    bg={isOwn ? 'teal.500' : otherBg}
                    color={isOwn ? 'white' : 'gray.800'}
                    borderWidth={isOwn ? '0' : '1px'}
                    borderColor={otherBorder}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    borderBottomRightRadius={isOwn ? 'sm' : 'lg'}
                    borderBottomLeftRadius={isOwn ? 'lg' : 'sm'}
                    boxShadow="sm"
                >
                    {!isOwn && showSender && (
                        <HStack spacing={1.5} mb={0.5}>
                            <Text fontSize="xs" fontWeight="bold" color="teal.600" noOfLines={1}>
                                {senderName}
                            </Text>
                            <Badge
                                colorScheme={roleTagColor(msg.senderRole)}
                                variant="subtle"
                                fontSize="8px"
                                px={1}
                                borderRadius="full"
                                textTransform="none"
                            >
                                {getRoleLabel(msg.senderRole)}
                            </Badge>
                        </HStack>
                    )}

                    <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word" lineHeight="1.5">
                        {msg.message}
                    </Text>

                    <Flex justify="flex-end" align="center" mt={0.5}>
                        <Text fontSize="2xs" color={isOwn ? 'whiteAlpha.800' : 'gray.400'}>
                            {msg.createdAt ? dayjs(msg.createdAt).format('h:mm A') : ''}
                        </Text>
                        {isOwn && <ReadTicks read={!!msg.read} />}
                    </Flex>
                </Box>
            </Box>
        </Flex>
    );
};

/**
 * Shared message thread + composer used by the student widget, the admin
 * panel and the educator panel.
 *
 * Props:
 *  - conversation: the open conversation object (optional — used for the header)
 *  - messages: array of messages (flat `read` flag, populated `sender`)
 *  - currentUser: the viewing user ({ _id, name, role, ... })
 *  - onSend(text): called with the trimmed composer text
 *  - sending: disables the composer while a send is in flight
 *  - onQuickReply(text): optional — shows the QuickReply popover slot
 *  - roleLabel: label rendered conceptually as the viewer, e.g. "You (Admin)"
 *  - onBack: optional — renders a compact header with a back button (widget)
 *  - loading: show a spinner instead of the thread
 *  - emptyState: optional React node replacing the default empty state
 *  - compact: tighter paddings for the floating widget
 *  - locked: disables the composer (e.g. a closed conversation that staff
 *    must explicitly reopen before replying) and shows `lockedMessage`
 *  - onReopen: optional — renders a "Reopen" button inside the locked banner
 */
const ChatWindow = ({
    conversation = null,
    messages = [],
    currentUser = null,
    onSend,
    sending = false,
    onQuickReply = null,
    roleLabel = 'You',
    onBack = null,
    loading = false,
    emptyState = null,
    compact = false,
    locked = false,
    lockedMessage = null,
    onReopen = null,
}) => {
    const [text, setText] = useState('');
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const containerRef = useRef(null);
    const endRef = useRef(null);

    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const lockedBannerBg = useColorModeValue('gray.50', 'gray.700');

    const myId = currentUser?._id || currentUser?.id;

    const rows = useMemo(() => {
        return messages.map((msg, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const own = isOwnMessage(msg, myId);
            const prevOwn = prev ? isOwnMessage(prev, myId) : null;
            const prevSenderId = prev ? (prev.sender?._id || prev.sender) : null;
            const senderId = msg.sender?._id || msg.sender;
            const showSender = !prev || prevOwn !== own || String(prevSenderId) !== String(senderId);
            const day = msg.createdAt ? dayjs(msg.createdAt).format('YYYY-MM-DD') : '';
            const prevDay = prev?.createdAt ? dayjs(prev.createdAt).format('YYYY-MM-DD') : '';
            const isNewDay = idx === 0 || day !== prevDay;
            return { msg, isOwn: own, showSender, isNewDay };
        });
    }, [messages, myId]);

    const scrollToBottom = (smooth = false) => {
        endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
        setShowScrollBtn(false);
    };

    // Auto-scroll to bottom on new messages / conversation switch
    useEffect(() => {
        scrollToBottom(false);
    }, [messages.length, conversation?._id]);

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        setShowScrollBtn((el.scrollHeight - el.scrollTop - el.clientHeight) > 120);
    };

    const submit = () => {
        const trimmed = text.trim();
        if (!trimmed || sending || !onSend) return;
        onSend(trimmed);
        setText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    const pad = compact ? 3 : 4;

    return (
        <Box display="flex" flexDirection="column" h="100%" minH={0} position="relative">
            {/* Optional compact header (floating widget) */}
            {onBack && (
                <Flex
                    p={2}
                    px={3}
                    borderBottomWidth="1px"
                    borderColor={borderColor}
                    align="center"
                    gap={2}
                    flexShrink={0}
                >
                    <IconButton
                        icon={<FiChevronLeft />}
                        size="sm"
                        variant="ghost"
                        onClick={onBack}
                        aria-label={t('back')}
                    />
                    <Box minW={0} flex={1}>
                        <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                            {conversation?.subject || t('conversation')}
                        </Text>
                    </Box>
                    {conversation && <ConversationStatusBadge status={conversation.status} fontSize="9px" />}
                </Flex>
            )}

            {/* Messages */}
            <Box
                ref={containerRef}
                onScroll={handleScroll}
                flex={1}
                minH={0}
                overflowY="auto"
                p={pad}
                sx={{
                    '&::-webkit-scrollbar': { width: '5px' },
                    '&::-webkit-scrollbar-thumb': { bg: 'gray.300', borderRadius: 'full' },
                }}
            >
                {loading ? (
                    <Flex justify="center" align="center" h="100%">
                        <Spinner size="md" thickness="3px" color="teal.500" />
                    </Flex>
                ) : rows.length === 0 ? (
                    emptyState || (
                        <Flex direction="column" align="center" justify="center" h="100%" py={8}>
                            <Icon as={FiMessageCircle} boxSize={compact ? 8 : 12} opacity={0.2} />
                            <Text mt={3} fontSize="sm" color="gray.500">{t('noMessages')}</Text>
                            <Text fontSize="xs" color="gray.400">{t('sendMessageToStart')}</Text>
                        </Flex>
                    )
                ) : (
                    <Box>
                        {rows.map(({ msg, isOwn, showSender, isNewDay }, idx) => (
                            <Box key={msg._id || idx}>
                                {isNewDay && (
                                    <Flex justify="center" mb={3} mt={idx === 0 ? 0 : 4}>
                                        <Badge
                                            variant="subtle"
                                            colorScheme="gray"
                                            fontSize="xs"
                                            px={3}
                                            py={1}
                                            borderRadius="full"
                                            textTransform="uppercase"
                                        >
                                            {dayjs(msg.createdAt).calendar(null, {
                                                sameDay: '[Today]',
                                                lastDay: '[Yesterday]',
                                                lastWeek: 'MMM D, YYYY',
                                                sameElse: 'MMMM D, YYYY',
                                            })}
                                        </Badge>
                                    </Flex>
                                )}
                                <MessageBubble msg={msg} isOwn={isOwn} showSender={showSender} />
                            </Box>
                        ))}
                        <Box ref={endRef} />
                    </Box>
                )}
            </Box>

            {/* Scroll-to-bottom shortcut */}
            {showScrollBtn && (
                <IconButton
                    icon={<FiChevronDown />}
                    position="absolute"
                    bottom="76px"
                    right="16px"
                    size="sm"
                    isRound
                    colorScheme="teal"
                    aria-label={t('scrollToBottom')}
                    onClick={() => scrollToBottom(true)}
                    boxShadow="lg"
                    zIndex={1}
                />
            )}

            {/* Composer */}
            <Box p={pad} pt={2} borderTopWidth="1px" borderColor={borderColor} flexShrink={0}>
                {locked ? (
                    <Flex
                        align="center"
                        justify="space-between"
                        gap={3}
                        bg={lockedBannerBg}
                        borderRadius="lg"
                        p={3}
                        flexWrap="wrap"
                    >
                        <Text fontSize="sm" color="gray.500">
                            {lockedMessage || t('resolvedAndClosed')}
                        </Text>
                        {onReopen && (
                            <Box
                                as="button"
                                type="button"
                                onClick={onReopen}
                                color="teal.600"
                                fontWeight="semibold"
                                fontSize="sm"
                                _hover={{ textDecoration: 'underline' }}
                            >
                                {t('reopenToContinue')}
                            </Box>
                        )}
                    </Flex>
                ) : (
                    <>
                        {(onQuickReply || !compact) && (
                            <Flex justify="space-between" align="center" mb={2} gap={2}>
                                <HStack spacing={2}>
                                    {onQuickReply && (
                                        <QuickReply onSelect={onQuickReply} size="xs" role={currentUser?.role} />
                                    )}
                                    <Text fontSize="xs" color="gray.400" noOfLines={1}>{roleLabel}</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.400" display={{ base: 'none', md: 'block' }}>
                                    {t('enterToSend')}
                                </Text>
                            </Flex>
                        )}
                        <Flex gap={2} align="flex-end">
                            <Textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('typeMessage')}
                                size="sm"
                                rows={Math.min(4, Math.max(1, text.split('\n').length))}
                                resize="none"
                                isDisabled={sending}
                                flex={1}
                                borderRadius="lg"
                                minH="40px"
                                maxH="120px"
                            />
                            <IconButton
                                icon={<FiSend />}
                                colorScheme="teal"
                                aria-label={t('send')}
                                isLoading={sending}
                                isDisabled={!text.trim()}
                                onClick={submit}
                                isRound={compact}
                                borderRadius={compact ? undefined : 'lg'}
                                alignSelf="flex-end"
                            />
                        </Flex>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default ChatWindow;
