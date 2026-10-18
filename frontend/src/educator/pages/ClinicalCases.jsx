import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, SimpleGrid, Spinner, Badge, Flex,
  Button, useColorModeValue, useToast, IconButton, Divider, Icon
} from '@chakra-ui/react';
import { FiHeart, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { getClinicalCases, deleteClinicalCase } from '../services/api';

const DIFFICULTY_COLORS = { easy: 'green', medium: 'orange', hard: 'red' };

const ClinicalCases = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const cardBg = useColorModeValue('white', 'gray.800');

  const fetchData = async () => {
    try { setLoading(true); const { data } = await getClinicalCases({ limit: 100 }); setCases(data.clinicalCases || []); } catch (e) { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (c) => { if (!window.confirm(`Delete "${c.title}"?`)) return; try { await deleteClinicalCase(c._id); toast({ title: 'Deleted', status: 'success', duration: 2000 }); fetchData(); } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); } };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box><Heading size="lg">Clinical Cases</Heading><Text fontSize="sm" color="gray.500">{cases.length} cases</Text></Box>
        <Button colorScheme="pink" leftIcon={<FiPlus />} onClick={() => navigate('/educator/clinical-cases/new')}>New Case</Button>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="pink.500" /></Flex>
        : cases.length === 0 ? <Box textAlign="center" py={16} color="gray.400"><Icon as={FiHeart} boxSize={12} mb={3} /><Heading size="md" mb={1}>No clinical cases</Heading></Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {cases.map((c) => (
              <Box key={c._id} bg={cardBg} borderRadius="xl" borderWidth="1px" shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box p={4}>
                  <Flex gap={2} mb={1} wrap="wrap">
                    <Badge colorScheme={DIFFICULTY_COLORS[c.difficulty]}>{c.difficulty}</Badge>
                    {c.specialty && <Badge colorScheme="blue">{c.specialty}</Badge>}
                    {c.premiumOnly && <Badge colorScheme="yellow">Premium</Badge>}
                  </Flex>
                  <Heading size="sm" noOfLines={1} mt={1}>{c.title}</Heading>
                  <Text fontSize="xs" color="gray.500" noOfLines={1} mt={1}>
                    {c.symptoms?.length || 0} symptoms
                  </Text>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="xs" flex={1} variant="outline" leftIcon={<FiEdit2 />}
                      onClick={() => navigate(`/educator/clinical-cases/${c._id}`)}>Edit</Button>
                    <IconButton size="xs" variant="ghost" colorScheme="red"
                      icon={<FiTrash2 />} onClick={() => handleDelete(c)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}
    </Box>
  );
};

export default ClinicalCases;
