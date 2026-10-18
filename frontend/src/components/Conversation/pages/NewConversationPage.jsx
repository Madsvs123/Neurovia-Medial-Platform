import React, { useState, useEffect } from 'react';
import {
    Box, Flex, Heading, FormControl, FormLabel, Input, Select,
    Textarea, Button, useColorModeValue, Spinner, Alert, AlertIcon,
    useToast, Avatar, Badge, useDisclosure, VStack, HStack, Text, Icon, IconButton,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSend, FiUser, FiX, FiMail } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import UserSearchModal from '../UserSearchModal';
import { CATEGORY_LABELS, getUserDisplayName, getRoleLabel } from '../conversationStatus';
import { t } from '../../conversationText';

/**
 * Shared "start a new conversation" page used by both the admin panel and
 * the educator panel (previously two ~220-line copies differing only by
 * route prefix).
 *
 * Props:
 *  - api: the portal's bound conversation API
 *  - basePath: '/admin/conversations' | '/educator/conversations'
 *  - currentUser: { _id|id, role }
 */
const NewConversationPage = ({ api, basePath, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const myId = currentUser?._id || currentUser?.id;

    const [formData, setFormData] = useState({ userId: '', subject: '', category: 'general', message: '' });
    const [selectedUser, setSelectedUser] = useState(null);

    const bgColor = useColorModeValue('white', 'gray.800');
    const cardBg = useColorModeValue('gray.50', 'gray.700');

    // Users + categories for the form
    const { data: formOptions, isLoading: isFormLoading, error: formError } = useQuery({
        queryKey: ['new-conversation-form'],
        queryFn: async () => (await api.getNewConversationForm()).data,
    });

    // Preselect recipient passed via location.state (e.g. from ProgramDetail)
    useEffect(() => {
        if (formOptions?.users && location.state?.recipientId) {
            const preSelected = formOptions.users.find(u => u._id === location.state.recipientId);
            if (preSelected && String(preSelected._id) !== String(myId)) {
                setSelectedUser(preSelected);
                setFormData(prev => ({ ...prev, userId: preSelected._id }));
            }
        }
    }, [formOptions, location.state, myId]);

    const createMutation = useMutation({
        mutationFn: (data) => api.createConversation(data),
        onSuccess: (response) => {
            toast({
                title: t('conversationCreated'),
                description: t('conversationCreatedSuccess'),
                status: 'success', duration: 3000, isClosable: true,
            });
            navigate(`${basePath}/${response.data._id}`);
        },
        onError: (error) => {
            toast({
                title: 'Error creating conversation',
                description: error.response?.data?.message || error.message,
                status: 'error', duration: 5000, isClosable: true,
            });
        },
    });

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setFormData(prev => ({ ...prev, userId: user._id }));
        onClose();
    };

    const handleClearUser = () => {
        setSelectedUser(null);
        setFormData(prev => ({ ...prev, userId: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.userId) {
            toast({ title: t('validationError'), description: t('pleaseSelectRecipient'), status: 'warning', duration: 3000 });
            return;
        }
        if (String(formData.userId) === String(myId)) {
            toast({ title: t('validationError'), description: 'Cannot start a conversation with yourself', status: 'warning', duration: 3000 });
            return;
        }
        if (!formData.subject.trim()) {
            toast({ title: t('validationError'), description: t('pleaseEnterSubject'), status: 'warning', duration: 3000 });
            return;
        }
        if (!formData.message.trim()) {
            toast({ title: t('validationError'), description: t('pleaseEnterMessage'), status: 'warning', duration: 3000 });
            return;
        }
        createMutation.mutate({
            userId: formData.userId,
            subject: formData.subject.trim(),
            category: formData.category,
            message: formData.message.trim(),
        });
    };

    if (isFormLoading) {
        return <Flex justify="center" align="center" h="400px"><Spinner size="xl" thickness="3px" color="teal.500" /></Flex>;
    }
    if (formError) {
        return <Alert status="error" borderRadius="lg"><AlertIcon />{formError.response?.data?.message || formError.message}</Alert>;
    }

    return (
        <Box>
            <Flex alignItems="center" mb={6} gap={4}>
                <IconButton
                    icon={<FiArrowLeft />}
                    aria-label={t('back')}
                    onClick={() => navigate(basePath)}
                    variant="ghost"
                />
                <Heading size="xl">{t('startNewConversation')}</Heading>
            </Flex>

            <Box bg={bgColor} p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.200" boxShadow="sm">
                <form onSubmit={handleSubmit}>
                    <VStack spacing={6} align="stretch">
                        {/* Recipient */}
                        <FormControl isRequired>
                            <FormLabel>{t('recipient')}</FormLabel>
                            {selectedUser ? (
                                <Flex bg={cardBg} p={3} borderRadius="md" align="center" justify="space-between" flexWrap="wrap" gap={3}>
                                    <HStack spacing={3} minW={0}>
                                        <Avatar name={getUserDisplayName(selectedUser)} size="sm" bg="teal.500" />
                                        <Box minW={0}>
                                            <Text fontWeight="semibold" noOfLines={1}>{getUserDisplayName(selectedUser)}</Text>
                                            <HStack spacing={2} flexWrap="wrap">
                                                <HStack spacing={1} minW={0}>
                                                    <Icon as={FiMail} boxSize={3} color="gray.400" flexShrink={0} />
                                                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                                        {selectedUser.email || selectedUser.username || '—'}
                                                    </Text>
                                                </HStack>
                                                <Badge colorScheme="teal" variant="subtle" fontSize="2xs">
                                                    {getRoleLabel(selectedUser.role || 'student')}
                                                </Badge>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                    <Button size="sm" variant="ghost" onClick={handleClearUser} leftIcon={<FiX />}>
                                        {t('change')}
                                    </Button>
                                </Flex>
                            ) : (
                                <Button
                                    onClick={onOpen} w="full" variant="outline"
                                    leftIcon={<FiUser />} justifyContent="flex-start" height="48px"
                                >
                                    {t('selectRecipient')}
                                </Button>
                            )}
                        </FormControl>

                        {/* Subject */}
                        <FormControl isRequired>
                            <FormLabel>{t('subject')}</FormLabel>
                            <Input
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder={t('subjectPlaceholder')}
                            />
                        </FormControl>

                        {/* Category */}
                        <FormControl>
                            <FormLabel>{t('category')}</FormLabel>
                            <Select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            >
                                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Message */}
                        <FormControl isRequired>
                            <FormLabel>{t('message')}</FormLabel>
                            <Textarea
                                value={formData.message}
                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                placeholder={t('messagePlaceholder')}
                                rows={8}
                                resize="vertical"
                            />
                            <Text fontSize="sm" color="gray.500" mt={2}>{t('messageTip')}</Text>
                        </FormControl>

                        {/* Actions */}
                        <Flex justifyContent="flex-end" gap={3}>
                            <Button variant="outline" onClick={() => navigate(basePath)}>
                                {t('cancel')}
                            </Button>
                            <Button
                                type="submit" colorScheme="teal" leftIcon={<FiSend />}
                                isLoading={createMutation.isPending} loadingText={t('creating')}
                            >
                                {t('startConversation')}
                            </Button>
                        </Flex>
                    </VStack>
                </form>
            </Box>

            <UserSearchModal
                isOpen={isOpen}
                onClose={onClose}
                users={formOptions?.users || []}
                currentUserId={myId}
                onSelect={handleUserSelect}
            />
        </Box>
    );
};

export default NewConversationPage;
