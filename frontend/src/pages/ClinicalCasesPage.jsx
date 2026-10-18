import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon,
  Input, InputGroup, InputLeftElement, Flex, Button, useColorModeValue,
  Icon, Tag, TagLabel, TagCloseButton, HStack, Badge, Card, CardBody,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiHeart, FiSearch } from 'react-icons/fi';
import { getClinicalCases } from '../services/api';
import ClinicalCaseCard from '../components/ClinicalCaseCard';

const SPECIALTIES = ['All', 'Cardiology', 'Neurology', 'Gastroenterology', 'Pulmonology', 'Endocrinology'];
const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const ClinicalCasesPage = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [animateIn, setAnimateIn] = useState(false);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search;
      if (specialty !== 'all') params.specialty = specialty;
      const { data } = await getClinicalCases(params);
      setCases(data.clinicalCases || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clinical cases');
    } finally {
      setLoading(false);
      setTimeout(() => setAnimateIn(true), 50);
    }
  };

  useEffect(() => { const t = setTimeout(fetchCases, 300); return () => clearTimeout(t); }, [search, specialty]);

  const premiumCount = cases.filter(c => c.premiumOnly).length;
  const hasFilters = search || specialty !== 'all';
  const clearFilters = () => { setSearch(''); setSpecialty('all'); };

  return (
    <Box bg={bgColor} minH="100vh">
      {/* ══════ HERO ══════ */}
      <Box bgGradient="linear(135deg, #2196F3 0%, #1565C0 100%)" color="white" position="relative" overflow="hidden"
        pt={10} pb={14} borderBottomRadius="2xl" mb={8}>
        <Box position="absolute" top="-50px" right="-30px" w="200px" h="200px" borderRadius="full" bg="whiteAlpha.10" pointerEvents="none" />
        <Box position="absolute" bottom="-30px" left="-20px" w="140px" h="140px" borderRadius="full" bg="whiteAlpha.50" pointerEvents="none" />
        <Container maxW="1400px" position="relative" zIndex={1}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={animateIn ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
            <Flex align="center" gap={4} mb={6}>
              <Box bg="whiteAlpha.200" p={3} borderRadius="xl"><FiHeart size={28} /></Box>
              <Box>
                <Heading size="xl" fontWeight="bold">Clinical Cases</Heading>
                <Text fontSize="md" opacity={0.9}>Real-world medical cases for diagnostic practice</Text>
              </Box>
            </Flex>
          </motion.div>
          <Flex gap={4} wrap="wrap">
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{loading ? '—' : cases.length}</Text>
              <Text fontSize="xs" opacity={0.8}>Total</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{loading ? '—' : premiumCount}</Text>
              <Text fontSize="xs" opacity={0.8}>Premium</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{SPECIALTIES.length - 1}</Text>
              <Text fontSize="xs" opacity={0.8}>Specialties</Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="1400px" pb={12}>
        {/* Search + Filters */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={6} wrap="wrap">
          <InputGroup maxW={{ md: '300px' }}>
            <InputLeftElement pointerEvents="none"><FiSearch color="gray.400" /></InputLeftElement>
            <Input placeholder="Search by title, diagnosis..." value={search}
              onChange={e => setSearch(e.target.value)} borderRadius="full" bg={cardBg} />
          </InputGroup>
          <Flex gap={2} wrap="wrap" align="center">
            {SPECIALTIES.map(s => (
              <Button key={s} size="sm" variant={specialty === s ? 'solid' : 'outline'}
                colorScheme="blue" onClick={() => setSpecialty(s)} borderRadius="full">{s}</Button>
            ))}
          </Flex>

        </Flex>

        {/* Active filters */}
        {hasFilters && (
          <Flex wrap="wrap" gap={2} mb={5}>
            {search && <Tag size="sm" borderRadius="full" colorScheme="blue"><TagLabel>Search: {search}</TagLabel><TagCloseButton onClick={() => setSearch('')} /></Tag>}
            {specialty !== 'all' && <Tag size="sm" borderRadius="full" colorScheme="blue" variant="subtle"><TagLabel>{specialty}</TagLabel><TagCloseButton onClick={() => setSpecialty('all')} /></Tag>}

            <Button size="xs" variant="ghost" colorScheme="blue" onClick={clearFilters}>Clear all</Button>
          </Flex>
        )}

        {/* Results */}
        {loading ? (
          <Box textAlign="center" py={20}><Spinner size="xl" thickness="3px" color="blue.500" /></Box>
        ) : error ? (
          <Alert status="error" borderRadius="xl"><AlertIcon /> {error}</Alert>
        ) : cases.length === 0 ? (
          <Box textAlign="center" py={20} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Icon as={FiHeart} boxSize={16} color="gray.300" mb={4} />
            <Heading size="md" mb={2}>No clinical cases found</Heading>
            <Text color="gray.500">{search ? 'Try a different search term' : 'No cases available'}</Text>
          </Box>
        ) : (
          <>
            <Text fontSize="sm" color="gray.500" mb={4}>{cases.length} case{cases.length !== 1 ? 's' : ''}</Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={5} as={motion.div} variants={containerVariant} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
              {cases.map((cc, i) => <ClinicalCaseCard key={cc._id} clinicalCase={cc} index={i} />)}
            </SimpleGrid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ClinicalCasesPage;
