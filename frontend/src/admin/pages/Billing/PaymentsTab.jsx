import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Text, SimpleGrid, Badge, Spinner, Alert, AlertIcon,
  Input, InputGroup, InputLeftElement, Select, IconButton, Button,
  useColorModeValue, useToast, HStack,
  Stat, StatLabel, StatNumber, StatHelpText,
  Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
} from '@chakra-ui/react';
import { FiSearch, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { getPayments, getPaymentStats, updatePaymentStatus, recordPayment, getUsers } from '../../services/api';
import dayjs from 'dayjs';

const PaymentsTab = ({ cardBg, borderColor, theadBg, rowHover, toast: parentToast }) => {
  const toast = parentToast;
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [form, setForm] = useState({ userId: '', amount: '', provider: 'stripe', transactionId: '', status: 'completed', receiptUrl: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const [payRes, stRes, uRes] = await Promise.allSettled([getPayments({ limit: 200 }), getPaymentStats(), getUsers()]);
      setPayments(payRes.value?.data?.payments || []);
      if (stRes.status === 'fulfilled') setStats(stRes.value?.data?.stats || null);
      setUsers(uRes.value?.data?.users || []);
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleStatus = async (p, status) => {
    try { await updatePaymentStatus(p._id, status); toast({ title: `Status → ${status}`, status: 'success', duration: 2000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const handleRecord = async () => {
    if (!form.userId || !form.amount || !form.provider || !form.transactionId) {
      toast({ title: 'Fill required fields', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      await recordPayment({ ...form, amount: parseFloat(form.amount) });
      toast({ title: 'Payment recorded', status: 'success', duration: 3000 });
      onClose(); setForm({ userId: '', amount: '', provider: 'stripe', transactionId: '', status: 'completed', receiptUrl: '' }); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const sc = (s) => ({ completed: 'green', pending: 'yellow', failed: 'red', refunded: 'purple' })[s] || 'gray';

  const filtered = payments.filter((p) => {
    const ms = p.userId?.username?.toLowerCase().includes(search.toLowerCase()) || p.transactionId?.toLowerCase().includes(search.toLowerCase());
    return ms && (statusFilter === 'all' || p.status === statusFilter);
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      {stats && (
        <SimpleGrid columns={4} spacing={4} mb={4}>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Revenue</StatLabel><StatNumber fontSize="lg" color="green.500">${(stats.totalRevenue || 0).toLocaleString()}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Transactions</StatLabel><StatNumber fontSize="lg">{stats.totalPayments || 0}</StatNumber><StatHelpText>{stats.completedPayments || 0} completed</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Avg</StatLabel><StatNumber fontSize="lg">${(stats.avgPayment || 0).toFixed(2)}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Success</StatLabel><StatNumber fontSize="lg" color="green.500">{stats.successRate || 0}%</StatNumber></Stat>
          </Box>
        </SimpleGrid>
      )}

      <Flex gap={3} mb={4} direction={{ base: 'column', md: 'row' }}>
        <InputGroup maxW="250px">
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search user or TX ID..." size="sm" value={search} onChange={e => setSearch(e.target.value)} />
        </InputGroup>
        <Select size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} maxW="140px">
          <option value="all">All</option><option value="completed">Completed</option><option value="pending">Pending</option>
          <option value="failed">Failed</option><option value="refunded">Refunded</option>
        </Select>
        <HStack spacing={2}>
          <IconButton icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={fetchAll} aria-label="Refresh" />
          <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={onOpen}>Record</Button>
        </HStack>
      </Flex>

      {loading ? <Flex justify="center" py={10}><Spinner /></Flex>
        : <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr><Th>User</Th><Th>Amount</Th><Th>Provider</Th><Th>TX ID</Th><Th>Status</Th><Th>Date</Th></Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0
                    ? <Tr><Td colSpan={6} textAlign="center" py={8} color="gray.400">No payments</Td></Tr>
                    : filtered.map((p) => (
                        <Tr key={p._id} _hover={{ bg: rowHover }}>
                          <Td><Text fontWeight="medium" fontSize="sm">{p.userId?.username || '—'}</Text></Td>
                          <Td><Text fontWeight="bold" color="green.500">${p.amount?.toFixed(2)}</Text></Td>
                          <Td><Badge variant="subtle" colorScheme={p.provider === 'stripe' ? 'blue' : 'purple'}>{p.provider || '—'}</Badge></Td>
                          <Td><Text fontSize="xs" fontFamily="monospace">{p.transactionId?.slice(0, 18)}...</Text></Td>
                          <Td><Select size="xs" value={p.status} borderRadius="full" onChange={e => handleStatus(p, e.target.value)}
                            ><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></Select></Td>
                          <Td><Text fontSize="xs">{dayjs(p.createdAt).format('MMM D, YYYY')}</Text></Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          </Box>}

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay /><ModalContent>
          <ModalHeader>Record Payment</ModalHeader><ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired><FormLabel>User</FormLabel>
                <Select value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} placeholder="Select...">
                  {users.map((u) => <option key={u._id} value={u._id}>{u.username}</option>)}
                </Select>
              </FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Amount ($)</FormLabel><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></FormControl>
                <FormControl isRequired><FormLabel>Provider</FormLabel><Select value={form.provider} onChange={e => setForm({...form, provider: e.target.value})}><option value="stripe">Stripe</option><option value="paypal">PayPal</option></Select></FormControl>
              </SimpleGrid>
              <FormControl isRequired><FormLabel>Transaction ID</FormLabel><Input value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})} /></FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>Status</FormLabel><Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
                </Select></FormControl>
                <FormControl><FormLabel>Receipt URL</FormLabel><Input value={form.receiptUrl} onChange={e => setForm({...form, receiptUrl: e.target.value})} /></FormControl>
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

export default PaymentsTab;
