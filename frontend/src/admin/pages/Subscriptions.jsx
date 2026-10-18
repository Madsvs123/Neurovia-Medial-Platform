import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Button, Badge, Spinner, Alert, AlertIcon, Input, InputGroup,
  InputLeftElement, Select, HStack, IconButton, useColorModeValue,
  Tooltip, useToast, SimpleGrid, Stat, StatLabel, StatNumber,
} from '@chakra-ui/react';
import { FiSearch, FiRefreshCw, FiEye, FiDollarSign, FiUsers } from 'react-icons/fi';
import { getSubscriptions, updateSubscriptionStatus, getSubscriptionStats } from '../services/api';
import dayjs from 'dayjs';

const Subscriptions = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const [subRes, statsRes] = await Promise.all([
        getSubscriptions({ limit: 100 }),
        getSubscriptionStats().catch(() => ({ data: { stats: null } })),
      ]);
      setSubs(subRes.data.subscriptions || []);
      setStats(statsRes.data.stats || null);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleStatusChange = async (sub, newStatus) => {
    try { await updateSubscriptionStatus(sub._id, newStatus);
      toast({ title: `Status changed to ${newStatus}`, status: 'success', duration: 2000 });
      fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
  };

  const statusColor = (s) => {
    switch (s) { case 'active': return 'green'; case 'canceled': return 'red'; case 'expired': return 'gray'; case 'pending': return 'yellow'; default: return 'gray'; }
  };

  const filtered = subs.filter((s) => {
    const matchSearch = s.userId?.username?.toLowerCase().includes(search.toLowerCase()) ||
      s.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.planId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">Subscriptions</Heading><Text color="gray.500" mt={1}>{subs.length} subscriptions</Text></Box>
        <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
      </Flex>

      {/* Stats */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Total</StatLabel><StatNumber>{stats.totalSubscriptions || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Active</StatLabel><StatNumber color="green.500">{stats.activeSubscriptions || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Canceled</StatLabel><StatNumber color="red.500">{stats.canceledSubscriptions || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Expired</StatLabel><StatNumber color="gray.500">{stats.expiredSubscriptions || 0}</StatNumber></Stat>
          </Box>
        </SimpleGrid>
      )}

      {/* Filters */}
      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search user or plan..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} maxW="160px">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead bg={theadBg}>
                  <Tr><Th>User</Th><Th>Plan</Th><Th>Status</Th><Th>Billing</Th><Th>Start</Th><Th>Expires</Th><Th textAlign="center">Actions</Th></Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0
                    ? <Tr><Td colSpan={7} textAlign="center" py={10} color="gray.400">No subscriptions</Td></Tr>
                    : filtered.map((sub) => (
                        <Tr key={sub._id} _hover={{ bg: rowHover }}>
                          <Td>
                            <Text fontWeight="medium">{sub.userId?.username || '—'}</Text>
                            <Text fontSize="xs" color="gray.400">{sub.userId?.email || ''}</Text>
                          </Td>
                          <Td><Badge colorScheme="blue">{sub.planId?.name || '—'}</Badge></Td>
                          <Td>
                            <Select size="xs" value={sub.status} borderRadius="full"
                              colorScheme={statusColor(sub.status)}
                              onChange={(e) => handleStatusChange(sub, e.target.value)}>
                              <option value="active">Active</option>
                              <option value="canceled">Canceled</option>
                              <option value="expired">Expired</option>
                              <option value="pending">Pending</option>
                            </Select>
                          </Td>
                          <Td>
                            <Badge variant="subtle" colorScheme={sub.autoRenew ? 'green' : 'gray'}>
                              {sub.autoRenew ? 'Auto' : 'Manual'}
                            </Badge>
                          </Td>
                          <Td><Text fontSize="sm">{dayjs(sub.startDate).format('MMM D, YYYY')}</Text></Td>
                          <Td>
                            <Text fontSize="sm" color={new Date(sub.expiresAt) < new Date() ? 'red.500' : undefined}>
                              {dayjs(sub.expiresAt).format('MMM D, YYYY')}
                            </Text>
                          </Td>
                          <Td>
                            <Flex justify="center" gap={2}>
                              <Tooltip label="View User" hasArrow>
                                <IconButton size="sm" variant="ghost" colorScheme="blue"
                                  icon={<FiEye />}
                                  onClick={() => navigate(`/admin/users/${sub.userId?._id}`)}
                                  aria-label="View user" />
                              </Tooltip>
                              <Badge variant="solid" colorScheme={sub.paymentProvider === 'stripe' ? 'blue' : 'purple'} fontSize="xs">
                                {sub.paymentProvider || '—'}
                              </Badge>
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          </Box>}
    </Box>
  );
};

export default Subscriptions;
