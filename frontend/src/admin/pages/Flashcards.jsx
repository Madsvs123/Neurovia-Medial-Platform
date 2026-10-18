import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Stat, StatLabel, StatNumber, StatHelpText,
  Progress, Divider,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw,
  FiLayers, FiCalendar, FiTarget, FiZap, FiChevronRight } from 'react-icons/fi';
import { getFlashcards, deleteFlashcard, getFlashcardStats, getDueFlashcards } from '../services/api';
import dayjs from 'dayjs';

const Flashcards = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showDueOnly, setShowDueOnly] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cardsRes, dueRes, statsRes] = await Promise.allSettled([
        getFlashcards({ limit: 200 }),
        getDueFlashcards(),
        getFlashcardStats(),
      ]);
      setFlashcards(cardsRes.value?.data?.flashcards || []);
      setDueCards(dueRes.value?.data?.flashcards || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data?.stats || null);
      if (cardsRes.status === 'rejected') setError(cardsRes.reason?.response?.data?.message || 'Failed to load');
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleDelete = async (card) => {
    if (!window.confirm('Delete this flashcard?')) return;
    try { await deleteFlashcard(card._id);
      toast({ title: 'Flashcard deleted', status: 'success', duration: 3000 });
      fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
  };

  const dueCardIds = new Set(dueCards.map((c) => c._id));
  const filtered = flashcards.filter((c) => {
    const ms = c.front?.toLowerCase().includes(search.toLowerCase()) ||
      c.back?.toLowerCase().includes(search.toLowerCase()) ||
      c.topic?.toLowerCase().includes(search.toLowerCase());
    const md = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    const mDue = !showDueOnly || dueCardIds.has(c._id);
    return ms && md && mDue;
  });

  const diffColor = (d) => ({ easy: 'green', medium: 'orange', hard: 'red' })[d] || 'gray';

  const masteryColor = (v) => {
    if (v >= 80) return 'green'; if (v >= 50) return 'orange'; return 'red';
  };

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}>
            <FiZap /> Flashcards
          </Heading>
          <Text color="gray.500" mt={1}>
            {flashcards.length} cards · {dueCards.length} due for review
            {stats && ` · ${Math.round(stats.avgMastery || 0)}% avg mastery`}
          </Text>
        </Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={() => navigate('/admin/flashcards/new')}>
            New Flashcard
          </Button>
        </HStack>
      </Flex>

      {/* Stats */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Stat size="sm"><StatLabel>Total Cards</StatLabel>
              <StatNumber fontSize="2xl">{stats.totalFlashcards || 0}</StatNumber>
              <StatHelpText>In your collection</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Stat size="sm"><StatLabel>Due for Review</StatLabel>
              <StatNumber fontSize="2xl" color="orange.500">{stats.dueFlashcards || 0}</StatNumber>
              <StatHelpText>Study now!</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Stat size="sm"><StatLabel>Avg Mastery</StatLabel>
              <StatNumber fontSize="2xl" color={masteryColor(stats.avgMastery || 0)}>
                {Math.round(stats.avgMastery || 0)}%
              </StatNumber>
              <Box mt={1}><Progress value={stats.avgMastery || 0} size="sm" colorScheme={masteryColor(stats.avgMastery || 0)} borderRadius="full" /></Box>
            </Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Stat size="sm"><StatLabel>Topics</StatLabel>
              <StatNumber fontSize="2xl">{stats.topicsCount || 0}</StatNumber>
              <StatHelpText>Different subjects</StatHelpText></Stat>
          </Box>
        </SimpleGrid>
      )}

      {/* Filters */}
      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search cards..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} maxW="150px">
          <option value="all">All Difficulty</option>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </Select>
        <Button size="sm" variant={showDueOnly ? 'solid' : 'outline'} colorScheme="orange"
          leftIcon={<FiCalendar />} onClick={() => setShowDueOnly(!showDueOnly)}>
          {showDueOnly ? 'All Cards' : `Due Only (${dueCards.length})`}
        </Button>
      </Flex>

      {/* Cards */}
      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? (
          <Box textAlign="center" py={20} color="gray.400">
            <FiZap size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <Text>No flashcards found</Text>
            <Button mt={4} colorScheme="teal" size="sm" onClick={() => navigate('/admin/flashcards/new')}>Create your first card</Button>
          </Box>
        ) : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map((card) => {
            const isDue = dueCardIds.has(card._id);
            const mastery = card.masteryLevel || 0;
            return (
              <Box key={card._id} bg={cardBg} borderRadius="xl" borderWidth="1px"
                borderColor={borderColor} shadow="sm" overflow="hidden"
                transition="all 0.2s" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                borderLeft="4px solid" borderLeftColor={isDue ? 'orange.400' : 'transparent'}>
                <Box p={4}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Badge fontSize="xs" variant="subtle">{card.topic || 'General'}</Badge>
                    <Badge colorScheme={diffColor(card.difficulty)} variant="solid" fontSize="xs">{card.difficulty}</Badge>
                  </Flex>
                  {/* Front */}
                  <Box bg={useColorModeValue('teal.50', 'teal.900')} p={3} borderRadius="md" mb={2} minH="60px">
                    <Text fontSize="xs" color="teal.600" fontWeight="bold" mb={1}>FRONT</Text>
                    <Text fontWeight="semibold" fontSize="sm">{card.front}</Text>
                  </Box>
                  {/* Back */}
                  <Box bg={useColorModeValue('gray.100', 'gray.700')} p={3} borderRadius="md" mb={3} minH="60px">
                    <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={1}>BACK</Text>
                    <Text fontSize="sm" color="gray.600">{card.back}</Text>
                  </Box>
                  {/* Progress + meta */}
                  <HStack spacing={4} fontSize="xs" color="gray.400" mb={2}>
                    <HStack spacing={1}><FiTarget size={12} /><span>{mastery}% mastery</span></HStack>
                    <HStack spacing={1}><FiLayers size={12} /><span>{card.reviewCount || 0} reviews</span></HStack>
                    {isDue && <Badge colorScheme="orange" variant="subtle" fontSize="xs">Due now!</Badge>}
                  </HStack>
                  <Progress value={mastery} size="xs" colorScheme={masteryColor(mastery)} borderRadius="full" mb={3} />
                  <Flex gap={2}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />}
                      onClick={() => navigate(`/admin/flashcards/${card._id}/edit`)}>Edit</Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red"
                      icon={<FiTrash2 />} onClick={() => handleDelete(card)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>}
    </Box>
  );
};

export default Flashcards;
