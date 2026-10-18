import React, { useState } from 'react';
import {
    Box, Button, Text, useColorModeValue, Popover, PopoverTrigger,
    PopoverContent, PopoverHeader, PopoverBody, PopoverArrow,
    PopoverCloseButton, InputGroup, Input, InputLeftElement,
    VStack, HStack, Icon, Wrap, WrapItem, Tooltip,
} from '@chakra-ui/react';
import {
    FiMessageSquare, FiSend, FiSearch, FiBookOpen, FiCreditCard,
    FiTool, FiActivity, FiUser, FiClock, FiCheckCircle, FiSmile,
} from 'react-icons/fi';
import { t } from '../conversationText';

/**
 * Shared quick-reply templates for the Neurovia medical-education platform.
 * Single list used by admin and educator panels.
 */
const QUICK_REPLY_GROUPS = [
    {
        category: 'Greeting',
        icon: FiSmile,
        color: 'teal',
        replies: [
            'Hello! Thank you for reaching out to Neurovia support. How can I help you with your learning today?',
            'Hi! Welcome to Neurovia. What can I help you with — a course, your subscription, or something else?',
        ],
    },
    {
        category: 'Course Access',
        icon: FiBookOpen,
        color: 'blue',
        replies: [
            'I\'ve checked your enrollment and restored access to the course. Please refresh the page and try opening the lesson again.',
            'You can find all your enrolled courses under "My Programs" in your dashboard. Let me know if a specific course is still missing.',
        ],
    },
    {
        category: 'Subscription & Billing',
        icon: FiCreditCard,
        color: 'orange',
        replies: [
            'Your subscription is active and renews automatically. You can manage or cancel it anytime from the Subscription page in your account.',
            'I\'ve reviewed the payment on your account and issued a refund. Please allow 3–5 business days for it to appear on your statement.',
        ],
    },
    {
        category: 'Technical Issue',
        icon: FiTool,
        color: 'purple',
        replies: [
            'Sorry you\'re running into this. Could you tell me which browser and device you\'re using, and share a screenshot of the error if possible?',
            'As a first step, please try logging out and back in, or clearing your browser cache. Let me know if the problem persists after that.',
        ],
    },
    {
        category: 'Clinical Content',
        icon: FiActivity,
        color: 'green',
        replies: [
            'Thank you for flagging this clinical content. I\'ve forwarded it to our medical review team, who will verify it against the latest guidelines.',
            'That\'s a great clinical question. Our content is based on standard references — I\'ll ask the editorial team to clarify this section for you.',
        ],
    },
    {
        category: 'Account Help',
        icon: FiUser,
        color: 'cyan',
        replies: [
            'I\'ve updated your account details as requested. You can review them on your Profile page.',
        ],
    },
    {
        category: 'Follow-up',
        icon: FiClock,
        color: 'yellow',
        replies: [
            'Just checking in — were you able to try the steps I suggested? I\'m happy to keep helping until this is sorted.',
        ],
    },
    {
        category: 'Closing',
        icon: FiCheckCircle,
        color: 'teal',
        replies: [
            'Is there anything else I can help you with? If not, I\'ll mark this conversation as resolved.',
            'Glad I could help! Good luck with your studies, and feel free to reach out anytime.',
        ],
    },
];

// Categories hidden from educators — billing/refund language is admin-only,
// educators have no business discussing payments with students.
const ROLE_BLOCKED_CATEGORIES = {
    educator: ['Subscription & Billing'],
};

const QuickReply = ({ onSelect, size = 'sm', role = null }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const bgColor = useColorModeValue('white', 'gray.800');

    const blockedCategories = ROLE_BLOCKED_CATEGORIES[role] || [];
    const availableGroups = QUICK_REPLY_GROUPS.filter(g => !blockedCategories.includes(g.category));

    const q = searchQuery.toLowerCase();
    const filteredGroups = availableGroups
        .map(group => ({
            ...group,
            replies: group.replies.filter(r =>
                !q || r.toLowerCase().includes(q) || group.category.toLowerCase().includes(q)
            ),
        }))
        .filter(group => group.replies.length > 0);

    const totalCount = availableGroups.reduce((acc, g) => acc + g.replies.length, 0);

    return (
        <Popover placement="top-start" isLazy>
            <PopoverTrigger>
                <Button
                    variant="outline"
                    colorScheme="teal"
                    leftIcon={<FiMessageSquare />}
                    size={size}
                    borderRadius="lg"
                >
                    {t('quickReply')}
                </Button>
            </PopoverTrigger>

            <PopoverContent bg={bgColor} width="480px" maxWidth="92vw" boxShadow="xl" borderRadius="lg">
                <PopoverArrow />
                <PopoverCloseButton />

                <PopoverHeader borderBottomWidth="1px" py={3}>
                    <VStack spacing={3} align="stretch">
                        <HStack spacing={2}>
                            <Icon as={FiMessageSquare} color="teal.500" />
                            <Text fontWeight="bold">{t('quickReplies')}</Text>
                            <Text fontSize="xs" color="gray.500">{totalCount} {t('templates')}</Text>
                        </HStack>
                        <InputGroup size="sm">
                            <InputLeftElement pointerEvents="none">
                                <FiSearch color="gray.400" />
                            </InputLeftElement>
                            <Input
                                placeholder={t('searchReplies')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                borderRadius="md"
                            />
                        </InputGroup>
                    </VStack>
                </PopoverHeader>

                <PopoverBody p={3} overflowY="auto" maxHeight="380px">
                    {filteredGroups.length === 0 ? (
                        <Box textAlign="center" py={8}>
                            <Icon as={FiSearch} boxSize={8} opacity={0.3} />
                            <Text mt={2} fontSize="sm" color="gray.500">{t('noRepliesFound')}</Text>
                        </Box>
                    ) : (
                        <VStack spacing={4} align="stretch">
                            {filteredGroups.map((group) => (
                                <Box key={group.category}>
                                    <HStack mb={2} spacing={2}>
                                        <Icon as={group.icon} color={`${group.color}.500`} boxSize={4} />
                                        <Text fontWeight="semibold" fontSize="sm">{group.category}</Text>
                                    </HStack>
                                    <Wrap spacing={2}>
                                        {group.replies.map((reply, idx) => (
                                            <WrapItem key={idx}>
                                                <Tooltip label={reply} hasArrow placement="top">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        colorScheme="teal"
                                                        onClick={() => onSelect && onSelect(reply)}
                                                        whiteSpace="normal"
                                                        textAlign="left"
                                                        h="auto"
                                                        py={2}
                                                        px={3}
                                                        _hover={{ bg: 'teal.50' }}
                                                        rightIcon={<FiSend />}
                                                    >
                                                        <Text fontSize="xs" noOfLines={2}>
                                                            {reply.length > 60 ? reply.slice(0, 60) + '…' : reply}
                                                        </Text>
                                                    </Button>
                                                </Tooltip>
                                            </WrapItem>
                                        ))}
                                    </Wrap>
                                </Box>
                            ))}
                        </VStack>
                    )}
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};

export default QuickReply;
