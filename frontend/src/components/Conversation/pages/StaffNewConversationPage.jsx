import React, { useState, useEffect } from 'react';
import {
    Box, Flex, Heading, FormControl, FormLabel, Input, Select,
    Textarea, Button, useColorModeValue, Spinner, Alert, AlertIcon,
    useToast, Avatar, Badge, useDisclosure, VStack, HStack, Text, Icon, IconButton,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSend, FiUser, FiX, FiMail } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UserSearchModal from '../UserSearchModal';
import { CATEGORY_LABELS, getUserDisplayName, getRoleLabel } from '../conversationStatus';
import { t } from '../../conversationText';

/**
 * "Start a conversation" form shared by the admin and educator panels.
 * Recipients and allowed categories come from GET /api/conversations/new,
 * which the backend scopes per role (admin: all users; educator: own students).
 *
 * Props: api, role, basePath, currentUser
 */
const StaffNewConversationPage = ({ api, role, basePath, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const myId = currentUser?._id || currentUser?.id;

    const [formData, setFormData] = useState({ userId: '', subject: '', category: 'general', message: '' });
    const [selectedUser, setSelectedUser] = useState(null);

    const bgColor = useColorModeValue('white', 'gray.800');
    const cardBg = useColorModeValue('gray.50', 'gray.700');

    const { data: formOptions, isLoading: isFormLoading, error: formError } = useQuery({
        queryKey: ['new-conversation-form'],
        queryFn: async () => (await api.getNewConversationForm()).data,
    });

    const categories = formOptions?.categories?.length ? formOptions.categories : Object.keys(CATEGORY_LABELS);

    // Preselect recipient passed via location.state (e.g. from ProgramDetail)
    useEffect(() => {
        if (formOptions?.users && location.state?.recipientId) {
            const preSelected = formOptions.users.find(u => u._id === location.state.recipientId);
            if (preSelected && String(preSelected._id) !== String(myId)) {
                setSelectedUser(preSelected);
                setFormData(prev => ({ ...prev, userId: preSelected._id }));
            } else if (!preSelected) {
                toast({
                    title: t('noUsersFound'),
                    description: role === 'educator' ? 'This user is not enrolled in one of your programs.' : undefined,
                    status: 'info', duration: 4000,
                });
            }
        }
    }, [formOptions, location.state, myId, role, toast]);

    const createMutation = useMutation({
        mutationFn: (data) => api.createConversation(data),
        onSuccess: (response) => {
            toast({ title: t('conversationCreated'), description: t('conversationCreatedSuccess'), status: 'success', duration: 3000, isClosable: true });
            queryClient.invalidateQueries({ queryKey: ['my-conversations'] });
            navigate(`${basePath}/${response.data._id}`);
        },
        onError: (error) => {
            toast({ title: 'Error creating conversation', description: error.response?.data?.message || error.message, status: 'error', duration: 5000, isClosable: true });
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
        const warn = (description) => toast({ title: t('validationError'), description, status: 'warning', duration: 3000 });
        if (!formData.userId) return warn(t('pleaseSelectRecipient'));
        if (String(formData.userId) === String(myId)) return warn('Cannot start a conversation with yourself');
        if (!formData.subject.trim()) return warn(t('pleaseEnterSubject'));
        if (!formData.message.trim()) return warn(t('pleaseEnterMessage'));
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
                <IconButton icon={<FiArrowLeft />} aria-label={t('back')} onClick={() => navigate(basePath)} variant="ghost" />
                <Heading size="xl">{t('startNewConversation')}</Heading>
            </Flex>

            {role === 'educator' && (
                <Alert status="info" borderRadius="lg" mb={4} fontSize="sm"><AlertIcon />{t('educatorCategoriesHint')}</Alert>
            )}

            <Box bg={bgColor} p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.200" boxShadow="sm">
                <form onSubmit={handleSubmit}>
                    <VStack spacing={6} align="stretch">
                        <FormControl isRequired>
                            <FormLabel>{t('recipient')}</FormLabel>
                            {selectedUser ? (
                                <Flex bg={cardBg} p={3} borderRadius="md" align="center" justify="space-between" flexWrap="wrap" gap={3}>
                                    <HStack spacing={3} minW={0}>
                                        <Avatar name={getUserDisplayName(selectedUser)} src={selectedUser.avatar || undefined} size="sm" bg="teal.500" />
                                        <Box minW={0}>
                                            <Text fontWeight="semibold" noOfLines={1}>{getUserDisplayName(selectedUser)}</Text>
                                            <HStack spacing={2} flexWrap="wrap">
                                                <HStack spacing={1} minW={0}>
                                                    <Icon as={FiMail} boxSize={3} color="gray.400" flexShrink={0} />
                                                    <Text fontSize="sm" color="gray.500" noOfLines={1}>{selectedUser.email || selectedUser.username || '—'}</Text>
                                                </HStack>
                                                <Badge colorScheme="teal" variant="subtle" fontSize="2xs">{getRoleLabel(selectedUser.role || 'student')}</Badge>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                    <Button size="sm" variant="ghost" onClick={handleClearUser} leftIcon={<FiX />}>{t('change')}</Button>
                                </Flex>
                            ) : (
                                <Button onClick={onOpen} w="full" variant="outline" leftIcon={<FiUser />} justifyContent="flex-start" height="48px">
                                    {t('selectRecipient')}
                                </Button>
                            )}
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>{t('subject')}</FormLabel>
                            <Input value={formData.subject} onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))} placeholder={t('subjectPlaceholder')} maxLength={200} />
                        </FormControl>

                        <FormControl>
                            <FormLabel>{t('category')}</FormLabel>
                            <Select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                                {categories.map((key) => (
                                    <option key={key} value={key}>{CATEGORY_LABELS[key] || key}</option>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel>{t('message')}</FormLabel>
                            <Textarea value={formData.message} onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} placeholder={t('messagePlaceholder')} rows={8} resize="vertical" maxLength={5000} />
                            <Text fontSize="sm" color="gray.500" mt={2}>{t('messageTip')}</Text>
                        </FormControl>

                        <Flex justifyContent="flex-end" gap={3}>
                            <Button variant="outline" onClick={() => navigate(basePath)}>{t('cancel')}</Button>
                            <Button type="submit" colorScheme="teal" leftIcon={<FiSend />} isLoading={createMutation.isPending} loadingText={t('creating')}>
                                {t('startConversation')}
                            </Button>
                        </Flex>
                    </VStack>
                </form>
            </Box>

            <UserSearchModal isOpen={isOpen} onClose={onClose} users={formOptions?.users || []} currentUserId={myId} onSelect={handleUserSelect} />
        </Box>
    );
};

export default StaffNewConversationPage;
