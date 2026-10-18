import React, { useEffect, useState } from 'react';
import {
  Box, Text, Heading, Container,
  useColorModeValue, useToast, Button, Icon, Flex, Badge, SimpleGrid, HStack, Spinner,
  Card, CardBody
} from '@chakra-ui/react';
import { FiArrowRight, FiBookOpen, FiAward, FiClipboard, FiTool, FiStar } from 'react-icons/fi';
import { GiMicroscope } from 'react-icons/gi';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMyPrograms } from '../services/api';

// ─── 6 Main Website Sections (Programs first) ─────────────────
const SECTIONS = [
  {
    id: 'programs',
    title: 'Programs',
    desc: 'Structured learning programs with multiple courses, quizzes, and hands-on projects.',
    icon: FiAward,
    color: 'teal',
    gradient: 'linear(135deg, #11998e 0%, #38ef7d 100%)',
    link: '/programs',
  },
  {
    id: 'courses',
    title: 'Courses',
    desc: 'Comprehensive medical courses with video lectures, quizzes, and certificates.',
    icon: FiBookOpen,
    color: 'blue',
    gradient: 'linear(135deg, #667eea 0%, #764ba2 100%)',
    link: '/courses',
  },
  {
    id: 'quizzes',
    title: 'Quizzes',
    desc: 'Test your knowledge with interactive quizzes and self-assessments.',
    icon: FiClipboard,
    color: 'purple',
    gradient: 'linear(135deg, #a18cd1 0%, #fbc2eb 100%)',
    link: '/quizzes',
  },
  {
    id: 'clinical-cases',
    title: 'Clinical Cases',
    desc: 'Real-world clinical case studies for practical learning and diagnosis practice.',
    icon: GiMicroscope,
    color: 'green',
    gradient: 'linear(135deg, #56ab2f 0%, #a8e063 100%)',
    link: '/clinical-cases',
  },
  {
    id: 'doctor-tools',
    title: 'Doctor Tools',
    desc: 'Medical calculators, algorithms, and productivity tools for healthcare professionals.',
    icon: FiTool,
    color: 'orange',
    gradient: 'linear(135deg, #f093fb 0%, #f5576c 100%)',
    link: '/doctor-tools',
  },
];

const sectionCard = (section, cardBg, borderColor) => (
  <Link key={section.id} to={section.link} style={{ textDecoration: 'none' }}>
    <Flex
      bg={cardBg}
      borderRadius="xl"
      boxShadow="sm"
      p={5}
      align="center"
      gap={4}
      transition="all 0.2s"
      borderWidth="1px"
      borderColor={borderColor}
      _hover={{ borderColor: `${section.color}.400`, bg: `${section.color}.50`, transform: 'translateX(4px)' }}
    >
      <Box bgGradient={section.gradient} p={3} borderRadius="lg" flexShrink={0}>
        <Icon as={section.icon} boxSize={5} color="white" />
      </Box>
      <Box flex="1" minW={0}>
        <Text fontWeight="bold" fontSize="sm">{section.title}</Text>
        <Text fontSize="xs" color="gray.500" noOfLines={1}>{section.desc}</Text>
      </Box>
      <Icon as={FiArrowRight} boxSize={4} color={`${section.color}.400`} flexShrink={0} />
    </Flex>
  </Link>
);

const HomePage = () => {
  const location = useLocation();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const [myPrograms, setMyPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // Show quiz result notification
  useEffect(() => {
    const state = location.state;
    if (state?.quizResult) {
      const result = state.quizResult;
      toast({
        title: `Quiz ${result.passed ? 'Completed' : 'Attempted'}`,
        description: `${result.percentage}% - ${result.correctAnswers}/${result.totalQuestions} correct`,
        status: result.passed ? 'success' : 'warning',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
      // Clean state after showing
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  // Fetch enrolled programs — re-fetch on any navigation (location.key changes)
  useEffect(() => {
    if (!isAuthenticated) {
      setMyPrograms([]);
      setLoadingPrograms(false);
      return;
    }
    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const { data } = await getMyPrograms();
        setMyPrograms(data.programs || []);
      } catch (err) {
        setMyPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };
    fetchPrograms();
  }, [isAuthenticated, location.key]);

  // Hero section
  const activePrograms = myPrograms.filter(p => p.active);
  const hasPrograms = activePrograms.length > 0;

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="1200px" px={4}>
        {/* ─── Welcome Section ─── */}
        {isAuthenticated && (
          <Box mb={10} bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)" borderRadius="3xl" p={8} color="white">
            <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ md: 'center' }} gap={4}>
              <Box>
                <Heading size="lg">Welcome back, {user?.username || 'Student'}!</Heading>
                <Text opacity={0.9} mt={1}>Continue your medical education journey</Text>
              </Box>
              {hasPrograms && (
                <Button as={Link} to={`/my-program/${activePrograms[0]._id}`} colorScheme="whiteAlpha" size="lg" rightIcon={<FiArrowRight />}>
                  Open Program
                </Button>
              )}
            </Flex>
          </Box>
        )}

        {/* ─── My Programs Section ─── */}
        {hasPrograms && (
          <Box mb={10}>
            <Flex align="center" gap={3} mb={4}>
              <Box bg="teal.500" p={2} borderRadius="lg">
                <FiAward size={20} color="white" />
              </Box>
              <Heading size="lg">My Programs</Heading>
              <Badge colorScheme="teal" borderRadius="full" px={2} py={0.5}>{activePrograms.length}</Badge>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
              {activePrograms.slice(0, 3).map((program) => (
                <Link key={program._id} to={`/my-program/${program._id}`} style={{ textDecoration: 'none' }}>
                  <Card
                    bg={cardBg}
                    borderRadius="xl"
                    boxShadow="md"
                    transition="all 0.3s"
                    borderWidth="1px"
                    borderColor={useColorModeValue('gray.100', 'gray.700')}
                    _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg', borderColor: 'teal.400' }}
                    overflow="hidden"
                    position="relative"
                  >
                    <Box h="3px" bgGradient="linear(135deg, #11998e, #38ef7d)" />
                    <CardBody p={4}>
                      <Flex align="center" gap={3}>
                        <Box bg="teal.50" p={2.5} borderRadius="lg">
                          <FiStar size={18} color="teal.500" />
                        </Box>
                        <Box flex="1" minW={0}>
                          <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{program.title}</Text>
                          <HStack spacing={2} mt={0.5}>
                            <Badge colorScheme="teal" borderRadius="full" fontSize="xs">{program.programType.replace('_', ' ')}</Badge>
                            <Text fontSize="xs" color="gray.400">
                              {program.currentUsers || 0} enrolled
                            </Text>
                          </HStack>
                        </Box>
                        <Icon as={FiArrowRight} boxSize={4} color="teal.400" />
                      </Flex>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </SimpleGrid>

          </Box>
        )}

        {/* ─── Main Sections Grid ─── */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
          {SECTIONS.map((section) => sectionCard(section, cardBg, borderColor))}
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default HomePage;
