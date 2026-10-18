import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon,
  Input, InputGroup, InputLeftElement, Flex, Button, useColorModeValue,
  Tabs, TabList, Tab, HStack, Icon, Tag, TagLabel, TagCloseButton, Badge,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiLayers, FiSearch, FiTrendingUp, FiUsers, FiClock, FiGift, FiPercent, FiAward, FiBookOpen, FiStar } from 'react-icons/fi';
import { getPrograms, getMyPrograms } from '../services/api';
import ProgramCard from '../components/ProgramCard';
import { useAuth } from '../hooks/useAuth';

const PROGRAM_TABS = [
  { id: 'all', label: 'All Programs', icon: FiLayers },
  { id: 'free_access', label: 'Free Access', icon: FiGift },
  { id: 'discount_access', label: 'Discount', icon: FiPercent },
  { id: 'quiz_bundle', label: 'Quiz Bundles', icon: FiAward },
  { id: 'clinical_cases_bundle', label: 'Clinical Cases', icon: FiClock },
  { id: 'premium_unlock', label: 'Premium', icon: FiTrendingUp },
];

const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const ProgramsPage = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [animateIn, setAnimateIn] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [enrolledProgramIds, setEnrolledProgramIds] = useState([]);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search;
      const tabValue = PROGRAM_TABS[activeTab]?.id;
      if (tabValue && tabValue !== 'all') params.programType = tabValue;
      const { data } = await getPrograms(params);
      setPrograms(data.programs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load programs');
    } finally {
      setLoading(false);
      setTimeout(() => setAnimateIn(true), 50);
    }
  };

  useEffect(() => { const t = setTimeout(fetchPrograms, 300); return () => clearTimeout(t); }, [search, activeTab]);

  useEffect(() => {
    const fetchEnrolled = async () => {
      if (isAuthenticated) {
        try {
          const { data } = await getMyPrograms();
          setEnrolledProgramIds((data.programs || []).map(p => p._id));
        } catch (err) {}
      }
    };
    fetchEnrolled();
  }, [isAuthenticated]);

  const enrolledCount = programs.filter(p => enrolledProgramIds.includes(p._id)).length;
  const discountCount = programs.filter(p => p.discountPercentage > 0).length;
  const clearFilters = () => { setSearch(''); setActiveTab(0); };
  const hasFilters = search || activeTab !== 0;

  return (
    <Box bg={bgColor} minH="100vh">
      {/* ══════ HERO ══════ */}
      <Box bgGradient="linear(135deg, #667eea 0%, #764ba2 50%, #553C9A 100%)" color="white"
        position="relative" overflow="hidden" pt={10} pb={14} borderBottomRadius="2xl" mb={8}>
        <Box position="absolute" top="-60px" right="-40px" w="250px" h="250px" borderRadius="full" bg="whiteAlpha.10" pointerEvents="none" />
        <Box position="absolute" bottom="-40px" left="-30px" w="180px" h="180px" borderRadius="full" bg="whiteAlpha.50" pointerEvents="none" />
        <Container maxW="1400px" position="relative" zIndex={1}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={animateIn ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
            <Flex align="center" gap={4} mb={6}>
              <Box bg="whiteAlpha.200" p={3} borderRadius="xl"><FiLayers size={28} /></Box>
              <Box>
                <Heading size="xl" fontWeight="bold">Learning Programs</Heading>
                <Text fontSize="md" opacity={0.9}>Curated learning paths combining courses, quizzes, and clinical cases</Text>
              </Box>
            </Flex>
          </motion.div>
          <Flex gap={4} wrap="wrap">
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{loading ? '—' : programs.length}</Text>
              <Text fontSize="xs" opacity={0.8}>Total</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold" color="green.300">{enrolledCount}</Text>
              <Text fontSize="xs" opacity={0.8}>Enrolled</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold" color="orange.200">{discountCount}</Text>
              <Text fontSize="xs" opacity={0.8}>On Sale</Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="1400px" pb={12}>
        {/* Search */}
        <Box mb={6}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none"><FiSearch color="gray.400" /></InputLeftElement>
            <Input placeholder="Search by title or code..." value={search}
              onChange={e => setSearch(e.target.value)} borderRadius="full" bg={cardBg} />
          </InputGroup>
        </Box>

        {/* Tabs */}
        <Tabs variant="soft-rounded" colorScheme="purple" onChange={setActiveTab} index={activeTab} mb={6}>
          <TabList display="flex" flexWrap="wrap" gap={2}>
            {PROGRAM_TABS.map(tab => (
              <Tab key={tab.id} fontSize="sm" px={4} py={1.5} borderRadius="full"
                _selected={{ bg: 'purple.500', color: 'white' }}>
                <HStack spacing={2}><Icon as={tab.icon} size={12} /><Text>{tab.label}</Text></HStack>
              </Tab>
            ))}
          </TabList>
        </Tabs>

        {/* Active filters */}
        {hasFilters && (
          <Flex wrap="wrap" gap={2} mb={5}>
            {search && <Tag size="sm" borderRadius="full" colorScheme="purple"><TagLabel>Search: {search}</TagLabel><TagCloseButton onClick={() => setSearch('')} /></Tag>}
            {activeTab !== 0 && <Tag size="sm" borderRadius="full" colorScheme="purple" variant="subtle"><TagLabel>{PROGRAM_TABS[activeTab]?.label}</TagLabel><TagCloseButton onClick={() => setActiveTab(0)} /></Tag>}
            <Button size="xs" variant="ghost" colorScheme="purple" onClick={clearFilters}>Clear all</Button>
          </Flex>
        )}

        {/* Results */}
        {loading ? (
          <Box textAlign="center" py={20}><Spinner size="xl" thickness="3px" color="purple.500" /></Box>
        ) : error ? (
          <Alert status="error" borderRadius="xl"><AlertIcon /> {error}</Alert>
        ) : programs.length === 0 ? (
          <Box textAlign="center" py={20} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Icon as={FiLayers} boxSize={16} color="gray.300" mb={4} />
            <Heading size="md" mb={2}>No programs found</Heading>
            <Text color="gray.500">{search ? 'Try a different search term' : 'No programs available in this category'}</Text>
          </Box>
        ) : (
          <>
            <Text fontSize="sm" color="gray.500" mb={4}>{programs.length} program{programs.length !== 1 ? 's' : ''}</Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5} alignItems="stretch"
              as={motion.div} variants={containerVariant} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
              {programs.map((program) => {
                const ownerId = program.owner?._id || (typeof program.owner === 'object' ? program.owner._id : program.owner);
                const currentUserId = user?.id || user?._id;
                const isOwned = user && currentUserId && (
                  (ownerId && ownerId.toString() === currentUserId.toString()) ||
                  (program.createdBy && program.createdBy.toString() === currentUserId.toString())
                );
                const isEnrolled = enrolledProgramIds.includes(program._id);
                return <ProgramCard key={program._id} program={program} enrolled={isEnrolled} owned={isOwned} />;
              })}
            </SimpleGrid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default ProgramsPage;
