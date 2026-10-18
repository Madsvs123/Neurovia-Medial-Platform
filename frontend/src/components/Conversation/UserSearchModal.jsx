import React, { useMemo, useState } from 'react';
import {
    Box, Flex, Text, Avatar, Badge, Button, Input, Select,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
    ModalBody, ModalFooter, InputGroup, InputLeftElement, InputRightElement,
    VStack, HStack, Icon, Spinner, useColorModeValue,
} from '@chakra-ui/react';
import { FiSearch, FiUser, FiX, FiMail } from 'react-icons/fi';
import { getUserDisplayName, getRoleLabel } from './conversationStatus';
import { t } from '../conversationText';

const roleBadgeColor = (role) => {
    switch (role) {
        case 'educator': return 'purple';
        case 'admin': return 'red';
        default: return 'blue';
    }
};

const statusBadgeColor = (status) => {
    switch (status) {
        case 'active': return 'green';
        case 'suspended': return 'red';
        default: return 'yellow';
    }
};

/**
 * Shared user-picker modal fed by GET /api/conversations/new.
 *
 * Props:
 *  - isOpen / onClose: Chakra modal control
 *  - users: array of { _id, name, username, email, role, status? }
 *  - onSelect(user): called when a user row is clicked
 *  - currentUserId: viewer id (excluded from the list)
 *  - isLoading: show spinner while the form data loads
 */
const UserSearchModal = ({
    isOpen,
    onClose,
    users = [],
    onSelect,
    currentUserId,
    isLoading = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const cardBg = useColorModeValue('gray.50', 'gray.700');

    const availableUsers = useMemo(
        () => users.filter(u => String(u._id) !== String(currentUserId)),
        [users, currentUserId]
    );

    const statusOptions = useMemo(() => {
        const set = new Set();
        availableUsers.forEach(u => { if (u.status) set.add(u.status); });
        return Array.from(set);
    }, [availableUsers]);

    const filteredUsers = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return availableUsers.filter(user => {
            const nameMatch = !q ||
                getUserDisplayName(user).toLowerCase().includes(q) ||
                (user.email || '').toLowerCase().includes(q) ||
                (user.username || '').toLowerCase().includes(q);
            const roleMatch = roleFilter === 'all' || user.role === roleFilter;
            const statusMatch = statusFilter === 'all' || (user.status || 'active') === statusFilter;
            return nameMatch && roleMatch && statusMatch;
        });
    }, [availableUsers, searchQuery, roleFilter, statusFilter]);

    const clearFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
        setStatusFilter('all');
    };

    const isFiltering = searchQuery || roleFilter !== 'all' || statusFilter !== 'all';

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Flex alignItems="center" gap={2}>
                        <FiUser />
                        <Text>{t('selectRecipient')}</Text>
                    </Flex>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <InputGroup mb={3}>
                        <InputLeftElement pointerEvents="none">
                            <FiSearch color="gray.400" />
                        </InputLeftElement>
                        <Input
                            placeholder={t('searchUsersPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {searchQuery && (
                            <InputRightElement>
                                <Button size="xs" variant="ghost" onClick={() => setSearchQuery('')} aria-label={t('clearSearch')}>
                                    <FiX />
                                </Button>
                            </InputRightElement>
                        )}
                    </InputGroup>

                    <Flex gap={2} mb={4} flexWrap="wrap" align="center">
                        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} maxW="140px" size="sm">
                            <option value="all">{t('allRoles')}</option>
                            <option value="student">{t('roleStudent')}</option>
                            <option value="educator">{t('roleEducator')}</option>
                        </Select>

                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} maxW="140px" size="sm">
                            <option value="all">{t('allStatuses')}</option>
                            {(statusOptions.length > 0 ? statusOptions : ['active']).map(s => (
                                <option key={s} value={s}>{getRoleLabel(s)}</option>
                            ))}
                        </Select>

                        {isFiltering && (
                            <Button size="sm" variant="ghost" onClick={clearFilters} leftIcon={<FiX />}>
                                {t('clear')}
                            </Button>
                        )}

                        <Text fontSize="sm" color="gray.500" ml="auto">
                            {filteredUsers.length} {filteredUsers.length === 1 ? t('userSingular') : t('userPlural')}
                        </Text>
                    </Flex>

                    {isLoading ? (
                        <Flex justify="center" py={10}>
                            <Spinner size="lg" thickness="3px" color="teal.500" />
                        </Flex>
                    ) : filteredUsers.length === 0 ? (
                        <Box textAlign="center" py={8}>
                            <Icon as={FiUser} boxSize={12} opacity={0.3} />
                            <Text mt={4} fontSize="lg" color="gray.500">{t('noUsersFound')}</Text>
                            <Text fontSize="sm" color="gray.400">
                                {isFiltering ? t('tryDifferentSearch') : t('noUsersAvailable')}
                            </Text>
                        </Box>
                    ) : (
                        <VStack align="stretch" spacing={2}>
                            {filteredUsers.map(user => (
                                <Flex
                                    key={user._id}
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="lg"
                                    cursor="pointer"
                                    align="center"
                                    gap={3}
                                    _hover={{ bg: cardBg, borderColor: 'teal.300' }}
                                    transition="all 0.15s"
                                    onClick={() => onSelect && onSelect(user)}
                                >
                                    <Avatar name={getUserDisplayName(user)} size="md" bg="teal.500" />
                                    <Box flex={1} minW={0}>
                                        <Text fontWeight="semibold" noOfLines={1}>
                                            {getUserDisplayName(user)}
                                        </Text>
                                        <HStack spacing={2} flexWrap="wrap">
                                            <HStack spacing={1} minW={0}>
                                                <Icon as={FiMail} boxSize={3} color="gray.400" flexShrink={0} />
                                                <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                                    {user.email || user.username || '—'}
                                                </Text>
                                            </HStack>
                                            <Badge colorScheme={roleBadgeColor(user.role)} fontSize="2xs">
                                                {getRoleLabel(user.role || 'student')}
                                            </Badge>
                                            {user.status && (
                                                <Badge colorScheme={statusBadgeColor(user.status)} fontSize="2xs">
                                                    {getRoleLabel(user.status)}
                                                </Badge>
                                            )}
                                        </HStack>
                                    </Box>
                                </Flex>
                            ))}
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>{t('close')}</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default UserSearchModal;
