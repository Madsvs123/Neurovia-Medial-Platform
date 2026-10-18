import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Button, Badge, Spinner, Alert, AlertIcon, Input, InputGroup,
  InputLeftElement, Select, HStack, IconButton, useColorModeValue,
  Tooltip, useToast, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
} from '@chakra-ui/react';
import { FiSearch, FiRefreshCw, FiDollarSign, FiPlus, FiArrowUpRight } from 'react-icons/fi';
import { getPayments, getPaymentStats, updatePaymentStatus, recordPayment, getUsers } from '../services/api';
import dayjs from 'dayjs';

const Payments = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [form, setForm] = useState({
    userId: '', amount: '', provider: 'stripe', transactionId: '', status: 'completed', receiptUrl: '',
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const [payRes, statsRes, userRes] = await Promise.all([
        getPayments({ limit: 200 }),
        getPaymentStats().catch(() => ({ data: { stats: null } })),
        getUsers().catch(() => ({ data: { users: [] } })),
      ]);
      setPayments(payRes.data.payments || []);
      setStats(statsRes.data.stats || null);
      setUsers(userRes.data.users || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleStatusChange = async (payment, newStatus) => {
    try { await updatePaymentStatus(payment._id, newStatus);
      toast({ title: `Status → ${newStatus}`, status: 'success', duration: 2000 });
      fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
  };

  const handleRecord = async () => {
    if (!form.userId || !form.amount || !form.provider || !form.transactionId) {
      toast({ title: 'Fill required fields', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      await recordPayment({ ...form, amount: parseFloat(form.amount) });
      toast({ title: 'Payment recorded', status: 'success', duration: 3000 });
      onClose(); setForm({ userId: '', amount: '', provider: 'stripe', transactionId: '', status: 'completed', receiptUrl: '' });
      fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const statusColor = (s) => {
    switch (s) { case 'completed': return 'green'; case 'pending': return 'yellow'; case 'failed': return 'red'; case 'refunded': return 'purple'; default: return 'gray'; }
  };

  const filtered = payments.filter((p) => {
    const matchSearch = p.userId?.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">Payments</Heading><Text color="gray.500" mt={1}>{payments.length} transactions</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={onOpen}>Record Payment</Button>
        </HStack>
      </Flex>

      {/* Stats */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Total Revenue</StatLabel><StatNumber color="green.500">${(stats.totalRevenue || 0).toLocaleString()}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Transactions</StatLabel><StatNumber>{stats.totalPayments || 0}</StatNumber><StatHelpText>{stats.completedPayments || 0} completed</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Avg Payment</StatLabel><StatNumber>${(stats.avgPayment || 0).toFixed(2)}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Success Rate</StatLabel><StatNumber color="green.500">{stats.successRate || 0}%</StatNumber></Stat>
          </Box>
        </SimpleGrid>
      )}

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search by user, email, or TX ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} maxW="160px">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead bg={theadBg}>
                  <Tr><Th>User</Th><Th>Amount</Th><Th>Provider</Th><Th>TX ID</Th><Th>Status</Th><Th>Date</Th><Th textAlign="center">Actions</Th></Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0
                    ? <Tr><Td colSpan={7} textAlign="center" py={10} color="gray.400">No payments</Td></Tr>
                    : filtered.map((p) => (
                        <Tr key={p._id} _hover={{ bg: rowHover }}>
                          <Td><Text fontWeight="medium">{p.userId?.username || '—'}</Text><Text fontSize="xs" color="gray.400">{p.userId?.email || ''}</Text></Td>
                          <Td><Text fontWeight="bold" fontSize="lg" color={p.amount > 0 ? 'green.500' : undefined}>${p.amount?.toFixed(2)}</Text></Td>
                          <Td><Badge variant="subtle" colorScheme={p.provider === 'stripe' ? 'blue' : 'purple'}>{p.provider || '—'}</Badge></Td>
                          <Td><Text fontSize="sm" fontFamily="monospace">{p.transactionId?.slice(0, 20)}...</Text></Td>
                          <Td><Select size="xs" value={p.status} borderRadius="full"
                            onChange={(e) => handleStatusChange(p, e.target.value)}>
                            <option value="completed">Completed</option><option value="pending">Pending</option>
                            <option value="failed">Failed</option><option value="refunded">Refunded</option>
                          </Select></Td>
                          <Td><Text fontSize="sm">{dayjs(p.createdAt).format('MMM D, YYYY')}</Text></Td>
                          <Td>
                            <Flex justify="center" gap={2}>
                              <Tooltip label="View User" hasArrow>
                                <IconButton size="sm" variant="ghost" colorScheme="blue" icon={<FiArrowUpRight />}
                                  onClick={() => navigate(`/admin/users/${p.userId?._id}`)} aria-label="View user" />
                              </Tooltip>
                              {p.receiptUrl && (
                                <IconButton size="sm" variant="ghost" colorScheme="green" icon={<FiDollarSign />}
                                  as="a" href={p.receiptUrl} target="_blank" aria-label="Receipt" />
                              )}
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          </Box>}

      {/* Record Payment Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired><FormLabel>User</FormLabel>
                <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="Select user...">
                  {users.map((u) => <option key={u._id} value={u._id}>{u.username} ({u.email})</option>)}
                </Select>
              </FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Amount ($)</FormLabel><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormControl>
                <FormControl isRequired><FormLabel>Provider</FormLabel><Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}><option value="stripe">Stripe</option><option value="paypal">PayPal</option></Select></FormControl>
              </SimpleGrid>
              <FormControl isRequired><FormLabel>Transaction ID</FormLabel><Input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder="tx_ch_..." /></FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>Status</FormLabel><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
                </Select></FormControl>
                <FormControl><FormLabel>Receipt URL</FormLabel><Input value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} /></FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleRecord} isLoading={saving}>Record</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Payments;
