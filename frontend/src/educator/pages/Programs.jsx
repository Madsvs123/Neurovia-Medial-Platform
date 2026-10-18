import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, useToast, Divider, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  Input, Select, Switch, Textarea
} from '@chakra-ui/react';
import { FiAward, FiPlus, FiTrash2, FiEdit2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { getPrograms, createProgram, toggleProgram, deleteProgram } from '../services/api';

const Programs = () => {
  const toast = useToast();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOpen: editOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');
  
  const [form, setForm] = useState({
    title: '', description: '', code: '', programType: 'free_access', 
    discountPercentage: '', freeAccess: false, maxUsers: '', expiresAt: ''
  });

  const fetchPrograms = useCallback(async () => {
    try { 
      setLoading(true); 
      const { data } = await getPrograms({ limit: 100, educatorMode: 'true' }); 
      setPrograms(data.programs || []); 
    } catch (e) { 
      setError('Failed to load programs'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const typeColor = (t) => ({ free_access: 'green', discount_access: 'orange', quiz_bundle: 'blue', clinical_cases_bundle: 'purple', premium_unlock: 'red' })[t] || 'gray';

  const handleToggle = async (prog) => {
    try {
      await toggleProgram(prog._id);
      toast({ title: `Program ${prog.active ? 'deactivated' : 'activated'}`, status: 'success', duration: 2000 });
      fetchPrograms();
    } catch (err) {
      toast({ title: 'Error toggling program', status: 'error', duration: 3000 });
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.description || !form.code) {
      toast({ title: 'Title, description, and code required', status: 'warning', duration: 3000 });
      return;
    }
    try {
      const payload = {
        ...form,
        discountPercentage: form.discountPercentage ? parseFloat(form.discountPercentage) : 0,
        maxUsers: form.maxUsers ? parseInt(form.maxUsers) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
      };
      
      await createProgram(payload);
      toast({ title: 'Program created', status: 'success', duration: 3000 });
      onEditClose();
      fetchPrograms();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async (prog) => {
    if (!window.confirm(`Delete program "${prog.title}" and all its resources?`)) return;
    try {
      await deleteProgram(prog._id);
      toast({ title: 'Program deleted', status: 'success', duration: 3000 });
      fetchPrograms();
    } catch (err) {
      toast({ title: 'Error deleting program', status: 'error', duration: 3000 });
    }
  };

  if (error && !loading) return <Alert status="error" borderRadius="lg"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">My Programs</Heading>
          <Text fontSize="sm" color="gray.500">{programs.length} programs</Text>
        </Box>
        <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={() => {
          setForm({ title: '', description: '', code: '', programType: 'free_access', discountPercentage: '', freeAccess: false, maxUsers: '', expiresAt: '' });
          onEditOpen();
        }}>New Program</Button>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : programs.length === 0 ? <Box textAlign="center" py={16} color="gray.400"><Icon as={FiAward} boxSize={12} mb={3} /><Heading size="md" mb={1}>No programs yet</Heading></Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {programs.map((p) => (
              <Box key={p._id} bg={cardBg} borderRadius="xl" borderWidth="1px" shadow="sm" overflow="hidden"
                _hover={{ shadow: 'md', transform: 'translateY(-4px)' }} transition="all 0.2s">
                <Box h="4px" bg={p.active ? 'teal.400' : 'gray.300'} />
                <Box p={6} display="flex" flexDirection="column" h="full">
                  <Flex justify="space-between" mb={3} align="flex-start">
                    <Badge colorScheme={typeColor(p.programType)} px={2} py={1} borderRadius="md" fontSize="xs">{p.programType.replace(/_/g, ' ')}</Badge>
                    <Badge colorScheme={p.active ? 'green' : 'gray'} borderRadius="full" px={2}>{p.active ? 'Active' : 'Inactive'}</Badge>
                  </Flex>
                  <Heading size="md" mb={2} noOfLines={1} title={p.title}>{p.title}</Heading>
                  <Text fontSize="sm" color="teal.500" fontWeight="medium" mb={2}>Code: {p.code}</Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={3} mb={4} flex={1}>{p.description}</Text>
                  
                  <Divider mb={4} />
                  <Flex direction="column" gap={3} mt="auto">
                    <Button size="sm" colorScheme="teal" leftIcon={<FiEdit2 />} as={Link} to={`/educator/programs/${p._id}`} w="full">
                      Manage Program
                    </Button>
                    <Flex justify="space-between" align="center" mt={1}>
                      <Button size="xs" variant="ghost" 
                        leftIcon={p.active ? <FiToggleLeft /> : <FiToggleRight />}
                        colorScheme={p.active ? 'orange' : 'green'}
                        onClick={() => handleToggle(p)}>
                        {p.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(p)} aria-label="Delete" />
                    </Flex>
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      {/* New Program Modal */}
      <Modal isOpen={editOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Program</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
              <Box>
                <Text fontSize="sm" mb={1}>Title *</Text>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Program title" />
              </Box>
              <Box>
                <Text fontSize="sm" mb={1}>Code *</Text>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PROGRAM-001" />
              </Box>
              <Box>
                <Text fontSize="sm" mb={1}>Type</Text>
                <Select value={form.programType} onChange={(e) => setForm({ ...form, programType: e.target.value })}
                  bg={useColorModeValue('white', 'gray.700')}
                >
                  <option value="free_access">Free Access</option>
                  <option value="discount_access">Discount Access</option>
                  <option value="quiz_bundle">Quiz Bundle</option>
                  <option value="clinical_cases_bundle">Clinical Cases Bundle</option>
                  <option value="premium_unlock">Premium Unlock</option>
                </Select>
              </Box>
              <Box>
                <Text fontSize="sm" mb={1}>Discount (%)</Text>
                <Input type="number" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} placeholder="0" />
              </Box>
              <Box>
                <Text fontSize="sm" mb={1}>Max Users</Text>
                <Input type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} placeholder="Unlimited" />
              </Box>
              <Box>
                <Text fontSize="sm" mb={1}>Expires At</Text>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </Box>
              <Box display="flex" alignItems="center" mt={6}>
                <Text fontSize="sm" mr={3}>Free Access</Text>
                <Switch isChecked={form.freeAccess} onChange={(e) => setForm({ ...form, freeAccess: e.target.checked })} />
              </Box>
            </SimpleGrid>
            <Box mb={4}>
              <Text fontSize="sm" mb={1}>Description *</Text>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Program description" rows={4} />
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSave} isLoading={loading}>Create Program</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Programs;
