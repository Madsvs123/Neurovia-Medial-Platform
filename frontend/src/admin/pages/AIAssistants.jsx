import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Divider, Tag, Table, Thead, Tbody, Tr, Th, Td,
  Tabs, TabList, TabPanels, Tab, TabPanel,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiToggleLeft, FiToggleRight, FiCpu } from 'react-icons/fi';
import { getAIAssistants, createAIAssistant, updateAIAssistant, toggleAIAssistant, deleteAIAssistant } from '../services/api';
import dayjs from 'dayjs';

const AIAssistants = () => {
  const toast = useToast();
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [form, setForm] = useState({
    name: '', type: '', specialty: '', description: '', systemPrompt: '',
    model: 'gpt-4', temperature: '0.7', visibility: 'public', capabilities: '', enabled: true,
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getAIAssistants({ limit: 100 });
      setAssistants(data.aiAssistants || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: '', specialty: '', description: '', systemPrompt: '', model: 'gpt-4', temperature: '0.7', visibility: 'public', capabilities: '', enabled: true });
    onOpen();
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      name: a.name || '', type: a.type || '', specialty: a.specialty || '', description: a.description || '',
      systemPrompt: a.systemPrompt || '', model: a.model || 'gpt-4', temperature: a.temperature?.toString() || '0.7',
      visibility: a.visibility || 'public', capabilities: a.capabilities?.join('\n') || '', enabled: a.enabled ?? true,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.type || !form.description || !form.systemPrompt) {
      toast({ title: 'Name, type, description, and system prompt required', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      const payload = { ...form, temperature: parseFloat(form.temperature) || 0.7, capabilities: form.capabilities.split('\n').map((c) => c.trim()).filter(Boolean) };
      if (editing) { await updateAIAssistant(editing._id, payload); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      else { await createAIAssistant(payload); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      onClose(); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (a) => {
    try { await toggleAIAssistant(a._id); fetchAll(); toast({ title: `${a.enabled ? 'Disabled' : 'Enabled'}`, status: 'success', duration: 2000 }); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    try { await deleteAIAssistant(a._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const filtered = assistants.filter((a) => {
    const ms = a.name?.toLowerCase().includes(search.toLowerCase()) || a.type?.toLowerCase().includes(search.toLowerCase()) || a.specialty?.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === 'all' || a.type === typeFilter;
    return ms && mt;
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">AI Assistants</Heading><Text color="gray.500" mt={1}>{assistants.length} assistants</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openCreate}>New Assistant</Button>
        </HStack>
      </Flex>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search by name, type, specialty..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} maxW="200px">
          <option value="all">All Types</option>
          {[...new Set(assistants.map((a) => a.type))].filter(Boolean).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? <Box textAlign="center" py={20} color="gray.400">No AI assistants</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filtered.map((a) => (
              <Box key={a._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box h="4px" bg={a.enabled ? 'teal.400' : 'gray.300'} />
                <Box p={5}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Flex align="center" gap={2}>
                      <Box bg="teal.100" p={2} borderRadius="lg"><FiCpu size={16} color="#319795" /></Box>
                      <Box>
                        <Heading size="sm">{a.name}</Heading>
                        <Badge fontSize="xs" colorScheme="blue">{a.type?.replace(/_/g, ' ')}</Badge>
                      </Box>
                    </Flex>
                    <Badge colorScheme={a.enabled ? 'green' : 'gray'}>{a.enabled ? 'On' : 'Off'}</Badge>
                  </Flex>
                  <Text fontSize="sm" color="gray.500" noOfLines={2} mb={2}>{a.description}</Text>
                  {a.specialty && <Badge variant="subtle" colorScheme="purple" fontSize="xs" mb={2}>{a.specialty}</Badge>}
                  <Flex gap={2} mb={2} fontSize="xs" color="gray.400">
                    <Badge variant="outline">{a.model}</Badge>
                    <Badge variant="outline">T: {a.temperature}</Badge>
                    <Badge variant="outline">{a.visibility}</Badge>
                  </Flex>
                  {a.capabilities?.length > 0 && (
                    <Flex wrap="wrap" gap={1} mb={3}>
                      {a.capabilities.slice(0, 3).map((c, i) => <Tag key={i} size="sm" colorScheme="teal" variant="subtle">{c}</Tag>)}
                      {a.capabilities.length > 3 && <Text fontSize="xs" color="gray.400">+{a.capabilities.length - 3}</Text>}
                    </Flex>
                  )}
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />} onClick={() => openEdit(a)}>Edit</Button>
                    <Button size="sm" variant="outline"
                      leftIcon={a.enabled ? <FiToggleLeft /> : <FiToggleRight />}
                      colorScheme={a.enabled ? 'orange' : 'green'} onClick={() => handleToggle(a)}>
                      {a.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(a)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay /><ModalContent>
          <ModalHeader>{editing ? 'Edit' : 'New'} AI Assistant</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NeuroLogic Assistant" /></FormControl>
                <FormControl isRequired><FormLabel>Type</FormLabel><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="neurology_assistant" /></FormControl>
              </SimpleGrid>
              <FormControl isRequired><FormLabel>Description</FormLabel><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Specialty</FormLabel><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Neurology, Cardiology" /></FormControl>
              <FormControl isRequired><FormLabel>System Prompt</FormLabel><Textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} rows={5} /></FormControl>
              <SimpleGrid columns={3} spacing={4} w="full">
                <FormControl><FormLabel>Model</FormLabel><Select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}>
                  <option value="gpt-4">GPT-4</option><option value="gpt-3.5-turbo">GPT-3.5 Turbo</option><option value="gpt-4o">GPT-4o</option>
                </Select></FormControl>
                <FormControl><FormLabel>Temperature</FormLabel><Input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></FormControl>
                <FormControl><FormLabel>Visibility</FormLabel><Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
                  <option value="public">Public</option><option value="private">Private</option>
                </Select></FormControl>
              </SimpleGrid>
              <FormControl><FormLabel>Capabilities (one per line)</FormLabel><Textarea value={form.capabilities} onChange={(e) => setForm({ ...form, capabilities: e.target.value })} rows={3} placeholder="Differential diagnosis&#10;Treatment recommendations&#10;Medical education" /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSave} isLoading={saving}>{editing ? 'Update' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AIAssistants;
