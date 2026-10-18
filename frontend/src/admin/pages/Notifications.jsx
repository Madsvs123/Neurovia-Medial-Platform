import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Button, Badge, Spinner, Alert, AlertIcon, Input, InputGroup,
  InputLeftElement, Select, HStack, IconButton, useColorModeValue,
  Tooltip, useToast, SimpleGrid, Stat, StatLabel, StatNumber,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Divider,
} from '@chakra-ui/react';
import { FiSearch, FiRefreshCw, FiPlus, FiTrash2, FiSend, FiCheck, FiBell } from 'react-icons/fi';
import { getNotifications, getNotificationStats, createNotification, broadcastNotification, deleteNotification, markNotificationAsRead, getUsers } from '../services/api';
import dayjs from 'dayjs';

const Notifications = () => {
  const toast = useToast();
  const [notifs, setNotifs] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const { isOpen: createOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: broadcastOpen, onOpen: onBroadcastOpen, onClose: onBroadcastClose } = useDisclosure();

  const [form, setForm] = useState({ userId: '', title: '', message: '', type: 'system' });
  const [broadForm, setBroadForm] = useState({ title: '', message: '', type: 'system', roleFilter: '' });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const [notifRes, statsRes, userRes] = await Promise.all([
        getNotifications({ limit: 200 }),
        getNotificationStats().catch(() => ({ data: { stats: null } })),
        getUsers().catch(() => ({ data: { users: [] } })),
      ]);
      setNotifs(notifRes.data.notifications || []);
      setStats(statsRes.data.stats || null);
      setUsers(userRes.data.users || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!form.userId || !form.title || !form.message) {
      toast({ title: 'User, title, and message required', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      await createNotification(form);
      toast({ title: 'Notification sent', status: 'success', duration: 3000 });
      onCreateClose(); setForm({ userId: '', title: '', message: '', type: 'system' }); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleBroadcast = async () => {
    if (!broadForm.title || !broadForm.message) {
      toast({ title: 'Title and message required', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      const { data } = await broadcastNotification(broadForm);
      toast({ title: `Broadcast sent to ${data.count || 'all'} users`, status: 'success', duration: 3000 });
      onBroadcastClose(); setBroadForm({ title: '', message: '', type: 'system', roleFilter: '' }); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (n) => {
    try { await deleteNotification(n._id); toast({ title: 'Deleted', status: 'success', duration: 2000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const handleMarkRead = async (n) => {
    try { await markNotificationAsRead(n._id); fetchAll(); }
    catch { /* */ }
  };

  const typeColor = (t) => {
    switch (t) { case 'subscription': return 'yellow'; case 'education': return 'blue'; case 'program': return 'purple'; case 'AI': return 'cyan'; case 'system': return 'gray'; default: return 'gray'; }
  };

  const filtered = notifs.filter((n) => {
    const ms = n.title?.toLowerCase().includes(search.toLowerCase()) || n.message?.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === 'all' || n.type === typeFilter;
    const mr = readFilter === 'all' || (readFilter === 'read' ? n.read : !n.read);
    return ms && mt && mr;
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">Notifications</Heading><Text color="gray.500" mt={1}>{notifs.length} notifications</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="purple" leftIcon={<FiSend />} onClick={onBroadcastOpen}>Broadcast</Button>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={onCreateOpen}>Send</Button>
        </HStack>
      </Flex>

      {/* Stats */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Total</StatLabel><StatNumber>{stats.totalNotifications || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Unread</StatLabel><StatNumber color="orange.500">{stats.unreadNotifications || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Read</StatLabel><StatNumber>{stats.readNotifications || 0}</StatNumber></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Read Rate</StatLabel><StatNumber>{stats.readPercentage || 0}%</StatNumber></Stat>
          </Box>
        </SimpleGrid>
      )}

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '250px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} maxW="150px">
          <option value="all">All Types</option>
          <option value="system">System</option><option value="education">Education</option>
          <option value="subscription">Subscription</option><option value="program">Program</option><option value="AI">AI</option>
        </Select>
        <Select value={readFilter} onChange={(e) => setReadFilter(e.target.value)} maxW="150px">
          <option value="all">All Status</option><option value="unread">Unread</option><option value="read">Read</option>
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr><Th>Title</Th><Th>Message</Th><Th>Type</Th><Th>Status</Th><Th>Date</Th><Th textAlign="center">Actions</Th></Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0
                    ? <Tr><Td colSpan={6} textAlign="center" py={10} color="gray.400">No notifications</Td></Tr>
                    : filtered.map((n) => (
                        <Tr key={n._id} _hover={{ bg: rowHover }} opacity={n.read ? 0.6 : 1}>
                          <Td><Text fontWeight={n.read ? 'normal' : 'semibold'} fontSize="sm">{n.title}</Text></Td>
                          <Td><Text fontSize="sm" noOfLines={2} maxW="250px">{n.message}</Text></Td>
                          <Td><Badge colorScheme={typeColor(n.type)} fontSize="xs">{n.type}</Badge></Td>
                          <Td><Badge colorScheme={n.read ? 'gray' : 'green'} fontSize="xs">{n.read ? 'Read' : 'New'}</Badge></Td>
                          <Td><Text fontSize="xs">{dayjs(n.createdAt).format('MMM D, h:mm A')}</Text></Td>
                          <Td>
                            <Flex justify="center" gap={1}>
                              {!n.read && (
                                <Tooltip label="Mark Read" hasArrow>
                                  <IconButton size="xs" variant="ghost" colorScheme="green"
                                    icon={<FiCheck />} onClick={() => handleMarkRead(n)} aria-label="Mark read" />
                                </Tooltip>
                              )}
                              <IconButton size="xs" variant="ghost" colorScheme="red"
                                icon={<FiTrash2 />} onClick={() => handleDelete(n)} aria-label="Delete" />
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          </Box>}

      {/* Send Modal */}
      <Modal isOpen={createOpen} onClose={onCreateClose} size="md">
        <ModalOverlay /><ModalContent>
          <ModalHeader>Send Notification</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired><FormLabel>User</FormLabel>
                <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="Select user...">
                  {users.map((u) => <option key={u._id} value={u._id}>{u.username} ({u.email})</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired><FormLabel>Title</FormLabel><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormControl>
              <FormControl isRequired><FormLabel>Message</FormLabel><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} /></FormControl>
              <FormControl><FormLabel>Type</FormLabel><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="system">System</option><option value="education">Education</option><option value="subscription">Subscription</option><option value="program">Program</option><option value="AI">AI</option>
              </Select></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onCreateClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSend} isLoading={saving}>Send</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Broadcast Modal */}
      <Modal isOpen={broadcastOpen} onClose={onBroadcastClose} size="md">
        <ModalOverlay /><ModalContent>
          <ModalHeader>Broadcast Notification</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired><FormLabel>Title</FormLabel><Input value={broadForm.title} onChange={(e) => setBroadForm({ ...broadForm, title: e.target.value })} placeholder="System Maintenance" /></FormControl>
              <FormControl isRequired><FormLabel>Message</FormLabel><Textarea value={broadForm.message} onChange={(e) => setBroadForm({ ...broadForm, message: e.target.value })} rows={3} /></FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>Type</FormLabel><Select value={broadForm.type} onChange={(e) => setBroadForm({ ...broadForm, type: e.target.value })}>
                  <option value="system">System</option><option value="education">Education</option><option value="subscription">Subscription</option>
                </Select></FormControl>
                <FormControl><FormLabel>Role Filter</FormLabel><Select value={broadForm.roleFilter} onChange={(e) => setBroadForm({ ...broadForm, roleFilter: e.target.value })}>
                  <option value="">All Users</option><option value="student">Students Only</option><option value="doctor">Doctors Only</option><option value="educator">Educators Only</option>
                </Select></FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onBroadcastClose}>Cancel</Button>
            <Button colorScheme="purple" onClick={handleBroadcast} isLoading={saving} leftIcon={<FiSend />}>Broadcast</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Notifications;
