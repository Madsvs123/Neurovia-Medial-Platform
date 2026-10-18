import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon,
  Input, InputGroup, InputLeftElement, Flex, Button, useColorModeValue,
  HStack, Icon, Tag, TagLabel, TagCloseButton, Wrap,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiClipboard, FiSearch, FiCheckCircle, FiXCircle, FiTarget, FiTrendingUp } from 'react-icons/fi';
import { getQuizzes, getMyCompletedQuizzes, getMyActivityLogs } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import QuizCard from '../components/QuizCard';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];

const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const QuizzesPage = () => {
  const { isAuthenticated } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [quizStatusMap, setQuizStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [animateIn, setAnimateIn] = useState(false);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizRes] = await Promise.all([getQuizzes()]);
      setQuizzes(quizRes.data.quizzes || []);

      if (isAuthenticated) {
        try {
          const [compRes, logRes] = await Promise.all([
            getMyCompletedQuizzes().catch(() => null),
            getMyActivityLogs({ resourceType: 'Quiz', action: 'quiz_completed', limit: 200 }).catch(() => null)
          ]);
          if (compRes) setCompletedIds((compRes.data.completedQuizIds || []).map(id => id.toString()));
          if (logRes?.data?.activityLogs) {
            const statuses = {};
            logRes.data.activityLogs.forEach((log) => {
              const quizId = log.resourceId?.toString();
              if (!quizId || statuses[quizId] !== undefined) return;
              const rawPassed = log.metadata?.passed;
              const scoreValue = log.metadata?.score;
              const parsedScore = typeof scoreValue === 'number' ? scoreValue : Number(scoreValue);
              statuses[quizId] = { passed: rawPassed === true || rawPassed === 'true', score: Number.isFinite(parsedScore) ? parsedScore : undefined };
            });
            setQuizStatusMap(statuses);
          }
        } catch (e) {}
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
      setTimeout(() => setAnimateIn(true), 50);
    }
  };

  useEffect(() => { fetchData(); }, [isAuthenticated]);

  useEffect(() => {
    let filtered = [...quizzes];
    if (search.trim()) filtered = filtered.filter(q => q.title?.toLowerCase().includes(search.toLowerCase()));
    if (difficultyFilter !== 'all') filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    filtered.sort((a, b) => {
      const aS = quizStatusMap[a._id]; const bS = quizStatusMap[b._id];
      const aP = aS?.passed === true ? 0 : aS?.passed === false ? 1 : 2;
      const bP = bS?.passed === true ? 0 : bS?.passed === false ? 1 : 2;
      return aP - bP;
    });
    setFilteredQuizzes(filtered);
  }, [search, difficultyFilter, quizzes, quizStatusMap]);

  const completedCount = quizzes.filter(q => completedIds.includes(q._id)).length;
  const passedCount = Object.values(quizStatusMap).filter(s => s.passed === true).length;
  const hasFilters = search || difficultyFilter !== 'all';
  const clearFilters = () => { setSearch(''); setDifficultyFilter('all'); };

  return (
    <Box bg={bgColor} minH="100vh">
      {/* ══════ HERO ══════ */}
      <Box bgGradient="linear(135deg, #805AD5 0%, #6B46C1 50%, #553C9A 100%)" color="white"
        position="relative" overflow="hidden" pt={10} pb={14} borderBottomRadius="2xl" mb={8}>
        <Box position="absolute" top="-50px" right="-30px" w="200px" h="200px" borderRadius="full" bg="whiteAlpha.10" pointerEvents="none" />
        <Box position="absolute" bottom="-30px" left="-20px" w="140px" h="140px" borderRadius="full" bg="whiteAlpha.50" pointerEvents="none" />
        <Container maxW="1400px" position="relative" zIndex={1}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={animateIn ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
            <Flex align="center" gap={4} mb={6}>
              <Box bg="whiteAlpha.200" p={3} borderRadius="xl"><FiClipboard size={28} /></Box>
              <Box>
                <Heading size="xl" fontWeight="bold">Quizzes</Heading>
                <Text fontSize="md" opacity={0.9}>Test your medical knowledge</Text>
              </Box>
            </Flex>
          </motion.div>
          <Flex gap={4} wrap="wrap">
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{loading ? '—' : quizzes.length}</Text>
              <Text fontSize="xs" opacity={0.8}>Total</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold" color="green.300">{loading ? '—' : passedCount}</Text>
              <Text fontSize="xs" opacity={0.8}>Passed</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold" color="teal.200">{loading ? '—' : completedCount}</Text>
              <Text fontSize="xs" opacity={0.8}>Attempted</Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="1400px" pb={12}>
        {/* Search + Filters */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={6} wrap="wrap" align="center">
          <InputGroup maxW={{ md: '300px' }}>
            <InputLeftElement pointerEvents="none"><FiSearch color="gray.400" /></InputLeftElement>
            <Input placeholder="Search quizzes..." value={search}
              onChange={e => setSearch(e.target.value)} borderRadius="full" bg={cardBg} />
          </InputGroup>
          <Flex gap={2} wrap="wrap">
            {DIFFICULTIES.map(d => (
              <Button key={d} size="sm" variant={difficultyFilter === d ? 'solid' : 'outline'}
                colorScheme="purple" onClick={() => setDifficultyFilter(d)} borderRadius="full"
                textTransform="capitalize">{d === 'all' ? 'All' : d}</Button>
            ))}
          </Flex>
        </Flex>

        {/* Active filters */}
        {hasFilters && (
          <Wrap spacing={2} mb={6}>
            {search && <Tag size="sm" borderRadius="full" colorScheme="purple"><TagLabel>Search: {search}</TagLabel><TagCloseButton onClick={() => setSearch('')} /></Tag>}
            {difficultyFilter !== 'all' && <Tag size="sm" borderRadius="full" colorScheme="purple" variant="subtle"><TagLabel>{difficultyFilter}</TagLabel><TagCloseButton onClick={() => setDifficultyFilter('all')} /></Tag>}
            <Button size="xs" variant="ghost" colorScheme="purple" onClick={clearFilters}>Clear all</Button>
          </Wrap>
        )}

        {/* Results */}
        {loading ? (
          <Box textAlign="center" py={20}><Spinner size="xl" color="purple.500" /></Box>
        ) : error ? (
          <Alert status="error" borderRadius="xl"><AlertIcon /> {error}</Alert>
        ) : filteredQuizzes.length === 0 ? (
          <Box textAlign="center" py={20} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Icon as={FiClipboard} boxSize={16} color="gray.300" mb={4} />
            <Heading size="md" mb={2}>No quizzes found</Heading>
            <Text color="gray.500">{search ? 'Try a different search' : 'No quizzes available'}</Text>
          </Box>
        ) : (
          <>
            <Text fontSize="sm" color="gray.500" mb={4}>{filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''}</Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={5}
              as={motion.div} variants={containerVariant} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
              {filteredQuizzes.map((quiz, i) => (
                <QuizCard key={quiz._id} quiz={quiz} completed={completedIds.includes(quiz._id)} status={quizStatusMap[quiz._id]} index={i} />
              ))}
            </SimpleGrid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default QuizzesPage;
