import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td, Avatar, Link,
} from '@chakra-ui/react';
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiEye,
  FiToggleLeft, FiToggleRight, FiGrid, FiList, FiPackage,
  FiUsers, FiCheckCircle, FiXCircle,
} from 'react-icons/fi';
import AdminProgramCard from '../components/AdminProgramCard';
import ProgramEditModal from '../components/ProgramEditModal';
import {
  getPrograms, createProgram, updateProgram, toggleProgram, deleteProgram,
} from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────
const getOwnerName = (program) => (
  program.ownerType === 'educator'
    ? program.owner?.username || 'Unknown Educator'
    : program.createdBy?.username || 'Site'
);

const StatusBadge = ({ active }) => (
  <Badge
    colorScheme={active ? 'success' : 'gray'}
    variant="subtle"
    fontSize="2xs"
    px={2}
    py={0.5}
    display="inline-flex"
    alignItems="center"
    gap={1}
  >
    {active ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
    {active ? 'Active' : 'Inactive'}
  </Badge>
);

// ─── Page Component ───────────────────────────────────────────────────
const ProgramsPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Edit modal
  const [editingProgram, setEditingProgram] = useState(null);
  const { isOpen: editOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getPrograms({ limit: 100 });
      setPrograms(data.programs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const openCreate = () => { setEditingProgram(null); onEditOpen(); };
  const openEdit = (prog) => { setEditingProgram(prog); onEditOpen(); };

  const handleSave = async (formData) => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : 0,
        maxUsers: formData.maxUsers ? parseInt(formData.maxUsers) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
      };
      if (editingProgram) {
        await updateProgram(editingProgram._id, payload);
        toast({ title: 'Program updated', status: 'success', duration: 3000 });
      } else {
        await createProgram(payload);
        toast({ title: 'Program created', status: 'success', duration: 3000 });
      }
      onEditClose();
      fetchPrograms();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Error saving program',
        status: 'error',
        duration: 3000,
      });
    } finally { setSaving(false); }
  };

  const handleToggle = async (prog) => {
    try {
      await toggleProgram(prog._id);
      toast({ title: `Program ${prog.active ? 'deactivated' : 'activated'}`, status: 'success', duration: 2000 });
      fetchPrograms();
    } catch { toast({ title: 'Error toggling program', status: 'error', duration: 2000 }); }
  };

  const handleDelete = async (prog) => {
    if (!window.confirm(`Delete "${prog.title}" and all its resources?`)) return;
    try {
      await deleteProgram(prog._id);
      toast({ title: 'Program deleted', status: 'success', duration: 3000 });
      fetchPrograms();
    } catch { toast({ title: 'Error deleting program', status: 'error', duration: 3000 }); }
  };

  const filtered = programs.filter((p) => {
    const matchSearch = !search
      || p.title?.toLowerCase().includes(search.toLowerCase())
      || p.code?.toLowerCase().includes(search.toLowerCase())
      || getOwnerName(p).toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.programType === typeFilter;
    return matchSearch && matchType;
  });

  const activeCount = programs.filter((p) => p.active !== false).length;
  const totalEnrolled = programs.reduce((s, p) => s + (p.currentUsers || 0), 0);

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>;

  return (
    <Box>
      {/* ── Header ────────────────────────────────────────────── */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Programs</Heading>
          <Text fontSize="sm" color={mutedColor}>{programs.length} programs</Text>
        </Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh">
            <IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchPrograms} aria-label="Refresh" />
          </Tooltip>
          <Button colorScheme="primary" leftIcon={<FiPlus />} onClick={openCreate}>
            New Program
          </Button>
          <HStack borderWidth="1px" borderRadius="md" p={1}>
            <IconButton
              icon={<FiGrid />} size="sm"
              variant={viewMode === 'grid' ? 'solid' : 'ghost'}
              colorScheme="primary"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            />
            <IconButton
              icon={<FiList />} size="sm"
              variant={viewMode === 'list' ? 'solid' : 'ghost'}
              colorScheme="primary"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            />
          </HStack>
        </HStack>
      </Flex>

      {/* ── Quick Stats ────────────────────────────────────────── */}
      <HStack spacing={4} mb={5} wrap="wrap">
        <Flex align="center" gap={2} bg={bg} px={4} py={2} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <FiPackage size={16} />
          <Text fontSize="sm"><strong>{programs.length}</strong> Total</Text>
        </Flex>
        <Flex align="center" gap={2} bg={bg} px={4} py={2} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <FiCheckCircle size={16} color="green" />
          <Text fontSize="sm"><strong>{activeCount}</strong> Active</Text>
        </Flex>
        <Flex align="center" gap={2} bg={bg} px={4} py={2} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <FiUsers size={16} />
          <Text fontSize="sm"><strong>{totalEnrolled}</strong> Enrolled</Text>
        </Flex>
      </HStack>

      {/* ── Search & Filters ─────────────────────────────────── */}
      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input
            placeholder="Search by title, code, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            borderRadius="lg"
          />
        </InputGroup>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} maxW="180px" borderRadius="lg">
          <option value="all">All Types</option>
          <option value="free_access">Free Access</option>
          <option value="discount_access">Discount</option>
          <option value="quiz_bundle">Quiz Bundle</option>
          <option value="clinical_cases_bundle">Clinical Cases</option>
          <option value="premium_unlock">Premium</option>
        </Select>
      </Flex>

      {/* ── Results ───────────────────────────────────────────── */}
      {loading ? (
        <Flex justify="center" py={20}><Spinner size="xl" color="primary.500" /></Flex>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={16} color="gray.400">
          <FiPackage size={48} style={{ margin: '0 auto 16px' }} />
          <Heading size="md" mb={1}>No programs found</Heading>
          <Text fontSize="sm">{search ? 'Try a different search' : 'Create a new program to get started'}</Text>
        </Box>
      ) : viewMode === 'grid' ? (
        /* ════════════ GRID VIEW ════════════ */
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
          {filtered.map((prog) => (
            <AdminProgramCard
              key={prog._id}
              program={prog}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </SimpleGrid>
      ) : (
        /* ════════════ LIST VIEW ════════════ */
        <Box bg={bg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden">
          <Table variant="simple">
            <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
              <Tr>
                <Th>Program</Th>
                <Th>Owner</Th>
                <Th>Users</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((prog) => (
                <Tr key={prog._id} _hover={{ bg: hoverBg }}>
                  <Td>
                    <Flex align="center" gap={2}>
                      <Box h="3px" w="20px" bg={prog.active ? 'primary.500' : 'gray.300'} borderRadius="full" />
                      <Box>
                        <Link
                          fontWeight="medium"
                          fontSize="sm"
                          color="primary.500"
                          onClick={() => navigate(`/admin/programs/${prog._id}`)}
                          cursor="pointer"
                        >
                          {prog.title}
                        </Link>
                        <Text fontSize="xs" color={mutedColor} fontFamily="mono">{prog.code}</Text>
                      </Box>
                    </Flex>
                  </Td>
                  <Td>
                    <Flex align="center" gap={2}>
                      <Avatar size="2xs" name={getOwnerName(prog)} bg="primary.500" color="white" />
                      <Text fontSize="sm">{getOwnerName(prog)}</Text>
                    </Flex>
                  </Td>
                  <Td>
                    <Text fontSize="sm">{prog.currentUsers || 0}{prog.maxUsers ? `/${prog.maxUsers}` : ''}</Text>
                  </Td>
                  <Td><StatusBadge active={prog.active !== false} /></Td>
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label="View details">
                        <IconButton size="sm" icon={<FiEye />} variant="ghost"
                          onClick={() => navigate(`/admin/programs/${prog._id}`)} aria-label="View" />
                      </Tooltip>
                      <Tooltip label="Toggle active">
                        <IconButton size="sm" icon={prog.active ? <FiToggleLeft /> : <FiToggleRight />}
                          variant="ghost" color={prog.active ? 'orange.500' : 'green.500'}
                          onClick={() => handleToggle(prog)} aria-label="Toggle" />
                      </Tooltip>
                      <Tooltip label="Delete">
                        <IconButton size="sm" icon={<FiTrash2 />} variant="ghost" color="red.500"
                          onClick={() => handleDelete(prog)} aria-label="Delete" />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Quick Edit Modal */}
      <ProgramEditModal
        isOpen={editOpen}
        onClose={onEditClose}
        program={editingProgram}
        onSave={handleSave}
        loading={saving}
      />
    </Box>
  );
};

export default ProgramsPage;
