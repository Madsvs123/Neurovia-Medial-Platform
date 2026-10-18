import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Button, Badge, Spinner, Alert, AlertIcon, Input, InputGroup,
  InputLeftElement, Select, HStack, IconButton, useColorModeValue,
  Menu, MenuButton, MenuList, MenuItem, Avatar, Tooltip,
  useToast,
} from '@chakra-ui/react';
import {
  FiSearch, FiMoreVertical, FiEye, FiEdit2,
  FiUserX, FiUserCheck, FiRefreshCw,
} from 'react-icons/fi';
import { getUsers, updateUser } from '../services/api';
import dayjs from 'dayjs';

const AdminUsers = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await updateUser(user._id, { status: newStatus });
      toast({ title: 'User updated', status: 'success', duration: 3000 });
      fetchUsers();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'purple';
      case 'educator': return 'blue';
      case 'doctor': return 'orange';
      default: return 'green';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  if (error && !loading) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon /> {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Users Management</Heading>
          <Text color="gray.500" mt={1}>
            Total: {users.length} users
          </Text>
        </Box>
        <Tooltip label="Refresh" hasArrow>
          <IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchUsers} aria-label="Refresh" />
        </Tooltip>
      </Flex>

      {/* Filters */}
      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement>
            <FiSearch color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          maxW={{ base: 'full', md: '160px' }}
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="doctor">Doctor</option>
          <option value="educator">Educator</option>
          <option value="admin">Admin</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW={{ base: 'full', md: '160px' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </Select>
      </Flex>

      {/* Users Table */}
      {loading ? (
        <Flex justify="center" py={20}>
          <Spinner size="xl" color="teal.500" />
        </Flex>
      ) : (
        <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
          overflow="hidden" shadow="sm">
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg={theadBg}>
                <Tr>
                  <Th>Username</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Last Login</Th>
                  <Th textAlign="center">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredUsers.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} textAlign="center" py={10} color="gray.400">
                      No users found
                    </Td>
                  </Tr>
                ) : (
                  filteredUsers.map((user) => (
                    <Tr key={user._id} _hover={{ bg: rowHover }}>
                      <Td>
                        <Flex align="center" gap={3}>
                          <Avatar size="sm" name={user.username} bg={`${getRoleColor(user.role)}.400`} />
                          <Box>
                            <Text fontWeight="medium">{user.username}</Text>
                            <Text fontSize="xs" color="gray.400">
                              {user.authProvider || 'local'}
                            </Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{user.email}</Text>
                        {user.verified && (
                          <Badge colorScheme="green" variant="subtle" fontSize="xs">Verified</Badge>
                        )}
                      </Td>
                      <Td>
                        <Badge colorScheme={getRoleColor(user.role)}>{user.role}</Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(user.status)}>{user.status}</Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm">
                          {user.lastLogin
                            ? dayjs(user.lastLogin).format('MMM D, YYYY')
                            : '—'}
                        </Text>
                      </Td>
                      <Td>
                        <Flex justify="center" gap={2}>
                          <Tooltip label="Details" hasArrow>
                            <IconButton
                              icon={<FiEye />}
                              size="sm" variant="ghost" colorScheme="blue"
                              onClick={() => navigate(`/admin/users/${user._id}`)}
                              aria-label="Details"
                            />
                          </Tooltip>
                          <Tooltip label="Edit" hasArrow>
                            <IconButton
                              icon={<FiEdit2 />}
                              size="sm" variant="ghost" colorScheme="green"
                              onClick={() => navigate(`/admin/users/${user._id}/edit`)}
                              aria-label="Edit"
                            />
                          </Tooltip>
                          <Menu>
                            <MenuButton as={IconButton}
                              icon={<FiMoreVertical />}
                              size="sm" variant="ghost" aria-label="More" />
                            <MenuList>
                              <MenuItem
                                icon={user.status === 'active' ? <FiUserX /> : <FiUserCheck />}
                                onClick={() => handleToggleStatus(user)}
                              >
                                {user.status === 'active' ? 'Suspend User' : 'Activate User'}
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Flex>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdminUsers;
