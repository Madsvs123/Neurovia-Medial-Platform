import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, SimpleGrid, Spinner, Badge, Flex,
  Button, useColorModeValue, useToast, IconButton, Divider, Icon
} from '@chakra-ui/react';
import { FiClipboard, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getQuizzes, deleteQuiz } from '../services/api';

const DIFFICULTY_COLORS = { easy: 'green', medium: 'orange', hard: 'red' };

const Quizzes = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const cardBg = useColorModeValue('white', 'gray.800');

  const fetchData = async () => {
    try { 
      setLoading(true); 
      const { data } = await getQuizzes({ limit: 100, mine: true }); 
      setQuizzes(data.quizzes || []); 
    } catch (e) { 
      // Silently fail or handle error
    } finally { 
      setLoading(false); 
    }
  };
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (q) => { 
    if (!window.confirm(`Delete "${q.title}"?`)) return; 
    try { 
      await deleteQuiz(q._id); 
      toast({ title: 'Deleted', status: 'success', duration: 2000 }); 
      fetchData(); 
    } catch { 
      toast({ title: 'Error', status: 'error', duration: 2000 }); 
    } 
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box><Heading size="lg">Quizzes</Heading><Text fontSize="sm" color="gray.500">{quizzes.length} quizzes</Text></Box>
        <Button colorScheme="purple" leftIcon={<FiPlus />} onClick={() => navigate('/educator/quizzes/new')}>New Quiz</Button>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="purple.500" /></Flex>
        : quizzes.length === 0 ? <Box textAlign="center" py={16} color="gray.400"><Icon as={FiClipboard} boxSize={12} mb={3} /><Heading size="md" mb={1}>No quizzes</Heading></Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {quizzes.map((q) => (
              <Box key={q._id} bg={cardBg} borderRadius="xl" borderWidth="1px" shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box p={4}>
                  <Flex justify="space-between" mb={1}>
                    <Badge colorScheme={DIFFICULTY_COLORS[q.difficulty]}>{q.difficulty}</Badge>
                    {q.premiumOnly && <Badge colorScheme="yellow">Premium</Badge>}
                  </Flex>
                  <Heading size="sm" noOfLines={1}>{q.title}</Heading>
                  <Text fontSize="xs" color="gray.500" mt={1}>{q.questions?.length || 0} questions · Pass: {q.passingScore}%{q.timeLimit ? ` · ${q.timeLimit}min` : ''}</Text>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="xs" flex={1} variant="outline" leftIcon={<FiEdit2 />} onClick={() => navigate(`/educator/quizzes/${q._id}`)}>Edit</Button>
                    <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(q)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}
    </Box>
  );
};

export default Quizzes;
