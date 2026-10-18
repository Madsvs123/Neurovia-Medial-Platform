import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Text, SimpleGrid, Badge, Spinner, Alert, AlertIcon,
  Input, InputGroup, InputLeftElement, Select, IconButton, useColorModeValue,
  Stat, StatLabel, StatNumber,
  Table, Thead, Tbody, Tr, Th, Td,
} from '@chakra-ui/react';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import { getSubscriptions, updateSubscriptionStatus, getSubscriptionStats } from '../../services/api';
import dayjs from 'dayjs';

const SubscriptionsTab = ({ cardBg, borderColor, theadBg, rowHover, toast }) => {
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const [sRes, stRes] = await Promise.allSettled([getSubscriptions({ limit: 200 }), getSubscriptionStats()]);
      setSubs(sRes.value?.data?.subscriptions || []);
      if (stRes.status === 'fulfilled') setStats(stRes.value?.data?.stats || null);
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleStatus = async (s, status) => {
    try { await updateSubscriptionStatus(s._id, status); toast({ title: `Status → ${status}`, status: 'success', duration: 2000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
  };

  const sc = (s) => ({ active: 'green', canceled: 'red', expired: 'gray', pending: 'yellow' })[s] || 'gray';

  const filtered = subs.filter((s) => {
    const ms = s.userId?.username?.toLowerCase().includes(search.toLowerCase()) || s.planId?.name?.toLowerCase().includes(search.toLowerCase());
    return ms && (statusFilter === 'all' || s.status === statusFilter);
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      {stats && (
        <SimpleGrid columns={4} spacing={4} mb={4}>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Total</StatLabel><StatNumber fontSize="lg">{stats.totalSubscriptions || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Active</StatLabel><StatNumber fontSize="lg" color="green.500">{stats.activeSubscriptions || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Canceled</StatLabel><StatNumber fontSize="lg" color="red.500">{stats.canceledSubscriptions || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Expired</StatLabel><StatNumber fontSize="lg" color="gray.500">{stats.expiredSubscriptions || 0}</StatNumber></Stat>
          </Box>
        </SimpleGrid>
      )}

      <Flex gap={3} mb={4} direction={{ base: 'column', md: 'row' }}>
        <InputGroup maxW="250px">
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search user/plan..." size="sm" value={search} onChange={e => setSearch(e.target.value)} />
        </InputGroup>
        <Select size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} maxW="140px">
          <option value="all">All</option><option value="active">Active</option><option value="canceled">Canceled</option>
          <option value="expired">Expired</option><option value="pending">Pending</option>
        </Select>
        <IconButton icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={fetchAll} aria-label="Refresh" />
      </Flex>

      {loading ? <Flex justify="center" py={10}><Spinner /></Flex>
        : <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr><Th>User</Th><Th>Plan</Th><Th>Status</Th><Th>Billing</Th><Th>Start</Th><Th>Expires</Th></Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0
                    ? <Tr><Td colSpan={6} textAlign="center" py={8} color="gray.400">No subscriptions</Td></Tr>
                    : filtered.map((s) => (
                        <Tr key={s._id} _hover={{ bg: rowHover }}>
                          <Td><Text fontWeight="medium" fontSize="sm">{s.userId?.username || '—'}</Text><Text fontSize="xs" color="gray.400">{s.userId?.email || ''}</Text></Td>
                          <Td><Badge colorScheme="blue">{s.planId?.name || '—'}</Badge></Td>
                          <Td><Select size="xs" value={s.status} borderRadius="full" onChange={e => handleStatus(s, e.target.value)}
                            ><option value="active">Active</option><option value="canceled">Canceled</option><option value="expired">Expired</option><option value="pending">Pending</option></Select></Td>
                          <Td><Badge variant="subtle" colorScheme={s.autoRenew ? 'green' : 'gray'}>{s.autoRenew ? 'Auto' : 'Manual'}</Badge></Td>
                          <Td><Text fontSize="xs">{dayjs(s.startDate).format('MMM D')}</Text></Td>
                          <Td><Text fontSize="xs" color={new Date(s.expiresAt) < new Date() ? 'red.500' : undefined}>{dayjs(s.expiresAt).format('MMM D, YYYY')}</Text></Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          </Box>}
    </Box>
  );
};

export default SubscriptionsTab;
