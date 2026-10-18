import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon,
  Button, useColorModeValue, Icon, Flex, HStack, Badge, Stat, StatLabel, StatNumber
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FiAward, FiPackage, FiClipboard, FiHeart, FiUsers, FiArrowRight } from 'react-icons/fi';
import { getMyPrograms, getCourses, getQuizzes, getClinicalCases } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({ programs: 0, courses: 0, quizzes: 0, clinicalCases: 0 });
  const [recentPrograms, setRecentPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [progRes, courseRes, quizRes, caseRes] = await Promise.all([
          getMyPrograms({ limit: 20 }),
          getCourses({ limit: 1 }),
          getQuizzes({ limit: 1 }),
          getClinicalCases({ limit: 1 }),
        ]);
        setStats({
          programs: progRes.data.programs?.length || 0,
          courses: courseRes.data.courses?.length || 0,
          quizzes: quizRes.data.quizzes?.length || 0,
          clinicalCases: caseRes.data.clinicalCases?.length || 0,
        });
        setRecentPrograms((progRes.data.programs || []).slice(0, 5));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>;
  if (error) return <Alert status="error" borderRadius="lg"><AlertIcon /> {error}</Alert>;

  const statCards = [
    { label: 'Programs', value: stats.programs, icon: FiAward, color: 'teal', link: '/educator/programs' },
    { label: 'Courses', value: stats.courses, icon: FiPackage, color: 'blue', link: '/educator/courses' },
    { label: 'Quizzes', value: stats.quizzes, icon: FiClipboard, color: 'purple', link: '/educator/quizzes' },
    { label: 'Clinical Cases', value: stats.clinicalCases, icon: FiHeart, color: 'pink', link: '/educator/clinical-cases' },
  ];

  return (
    <Box>
      <Heading size="lg" mb={6}>Educator Dashboard</Heading>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5} mb={8}>
        {statCards.map((s, i) => (
          <Link key={i} to={s.link}>
            <Box bg={cardBg} borderRadius="xl" boxShadow="sm" p={5} borderWidth="1px"
              borderColor={useColorModeValue('gray.100', 'gray.700')}
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }} transition="all 0.2s">
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="xs" color="gray.500">{s.label}</Text>
                <Box bg={`${s.color}.100`} p={2} borderRadius="md">
                  <Icon as={s.icon} boxSize={4} color={`${s.color}.500`} />
                </Box>
              </Flex>
              <Text fontSize="3xl" fontWeight="bold">{s.value}</Text>
            </Box>
          </Link>
        ))}
      </SimpleGrid>

      <Box bg={cardBg} borderRadius="xl" boxShadow="sm" p={6} borderWidth="1px"
        borderColor={useColorModeValue('gray.100', 'gray.700')}>
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">Your Programs</Heading>
          <Button as={Link} to="/educator/programs" size="sm" colorScheme="teal" rightIcon={<FiArrowRight />}>
            Manage
          </Button>
        </Flex>
        {recentPrograms.length === 0 ? (
          <Text color="gray.400" fontSize="sm">No programs yet. Create your first program to get started.</Text>
        ) : recentPrograms.filter(p => p.active).length === 0 ? (
          <Text color="gray.400" fontSize="sm">No active programs. Create or activate a program to get started.</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {recentPrograms.filter(p => p.active).map((p) => (
              <Flex key={p._id} p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg" align="center" gap={3}>
                <Box bg="teal.100" p={2} borderRadius="md">
                  <Icon as={FiAward} boxSize={4} color="teal.500" />
                </Box>
                <Box flex="1" minW={0}>
                  <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{p.title}</Text>
                  <Flex gap={2} align="center">
                    <Badge colorScheme="teal" borderRadius="full" fontSize="xs">{p.code}</Badge>
                  </Flex>
                </Box>
              </Flex>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
