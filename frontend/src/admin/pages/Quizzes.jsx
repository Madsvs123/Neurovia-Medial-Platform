import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  Icon, IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Divider,
} from '@chakra-ui/react';
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw,
  FiClipboard,
} from 'react-icons/fi';
import { getQuizzes, deleteQuiz } from '../services/api';

const Quizzes = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => { fetchQuizzes(); }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getQuizzes({ limit: 100 });
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quiz) => {
    if (!window.confirm(`Delete quiz "${quiz.title}"?`)) return;
    try {
      await deleteQuiz(quiz._id);
      toast({ title: 'Quiz deleted', status: 'success', duration: 3000 });
      fetchQuizzes();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const filtered = quizzes.filter((q) => {
    const matchSearch = q.title?.toLowerCase().includes(search.toLowerCase());
    const matchDiff = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    return matchSearch && matchDiff;
  });

  const DIFFICULTY_COLORS = { easy: 'green', medium: 'orange', hard: 'red' };

  if (error && !loading) {
    return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Quizzes</Heading>
          <Text color="gray.500" mt={1}>Total: {quizzes.length} quizzes</Text>
        </Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow>
            <IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchQuizzes} aria-label="Refresh" />
          </Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={() => navigate('/admin/quizzes/new')}>
            New Quiz
          </Button>
        </HStack>
      </Flex>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search quizzes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} maxW="160px">
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
      </Flex>

      {loading ? (
        <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={16} color="gray.400">
          <Icon as={FiClipboard} boxSize={12} mb={3} />
          <Heading size="md" mb={1}>No quizzes</Heading>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map((q) => (
            <Box key={q._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
              shadow="sm" overflow="hidden"
              _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
              <Box p={4}>
                <Flex justify="space-between" mb={1}>
                  <Badge colorScheme={DIFFICULTY_COLORS[q.difficulty] || 'gray'}>{q.difficulty}</Badge>
                  {q.premiumOnly && <Badge colorScheme="yellow">Premium</Badge>}
                </Flex>
                <Heading size="sm" noOfLines={1} mt={2}>{q.title}</Heading>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {q.questions?.length || 0} questions · Pass: {q.passingScore}%{q.timeLimit ? ` · ${q.timeLimit}min` : ''}
                </Text>
                <Divider my={2} />
                <Flex gap={2}>
                  <Button size="xs" flex={1} variant="outline" leftIcon={<FiEdit2 />}
                    onClick={() => navigate(`/admin/quizzes/${q._id}/edit`)}>Edit</Button>
                  <IconButton size="xs" variant="ghost" colorScheme="red"
                    icon={<FiTrash2 />} onClick={() => handleDelete(q)} aria-label="Delete" />
                </Flex>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default Quizzes;
