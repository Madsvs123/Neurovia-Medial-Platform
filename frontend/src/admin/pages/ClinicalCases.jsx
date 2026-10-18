import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Divider, Icon, Tag,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiHeart } from 'react-icons/fi';
import { getClinicalCases, deleteClinicalCase } from '../services/api';

const ClinicalCases = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getClinicalCases({ limit: 100 });
      setCases(data.clinicalCases || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.title}"?`)) return;
    try { await deleteClinicalCase(c._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const DIFFICULTY_COLORS = { easy: 'green', medium: 'orange', hard: 'red' };

  const filtered = cases.filter((c) => {
    const ms = c.title?.toLowerCase().includes(search.toLowerCase()) || c.diagnosis?.toLowerCase().includes(search.toLowerCase());
    const msp = specialtyFilter === 'all' || c.specialty === specialtyFilter;
    const md = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    return ms && msp && md;
  });

  const uniqueSpecialties = [...new Set(cases.map((c) => c.specialty))].filter(Boolean);

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">Clinical Cases</Heading><Text color="gray.500" mt={1}>{cases.length} cases</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={() => navigate('/admin/clinical-cases/new')}>New Case</Button>
        </HStack>
      </Flex>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '250px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search by title or diagnosis..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)} maxW="180px">
          <option value="all">All Specialties</option>
          {uniqueSpecialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} maxW="150px">
          <option value="all">All Difficulty</option>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? (
          <Box textAlign="center" py={16} color="gray.400">
            <Icon as={FiHeart} boxSize={12} mb={3} />
            <Heading size="md" mb={1}>No clinical cases</Heading>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {filtered.map((c) => (
              <Box key={c._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box p={4}>
                  <Flex gap={2} mb={1} wrap="wrap">
                    <Badge colorScheme={DIFFICULTY_COLORS[c.difficulty]}>{c.difficulty}</Badge>
                    {c.specialty && <Badge colorScheme="purple">{c.specialty}</Badge>}
                    {c.premiumOnly && <Badge colorScheme="yellow">Premium</Badge>}
                  </Flex>
                  <Heading size="sm" noOfLines={1} mt={1}>{c.title}</Heading>
                  <Text fontSize="xs" color="gray.500" noOfLines={1} mt={1}>
                    {c.symptoms?.length || 0} symptoms
                    {c.createdBy?.username ? ` · by ${c.createdBy.username}` : ''}
                  </Text>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="xs" flex={1} variant="outline" leftIcon={<FiEdit2 />}
                      onClick={() => navigate(`/admin/clinical-cases/${c._id}/edit`)}>Edit</Button>
                    <IconButton size="xs" variant="ghost" colorScheme="red"
                      icon={<FiTrash2 />} onClick={() => handleDelete(c)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        )}
    </Box>
  );
};

export default ClinicalCases;
