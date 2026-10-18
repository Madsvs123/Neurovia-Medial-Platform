import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon,
  Input, InputGroup, InputLeftElement, Select, Flex, Button, useColorModeValue,
  Tag, TagLabel, TagCloseButton, Wrap, HStack, Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiSearch, FiBookOpen, FiStar, FiLayers, FiTrendingUp } from 'react-icons/fi';
import { getCourses } from '../services/api';
import CourseCard from '../components/CourseCard';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = ['All', 'Anatomy', 'Physiology', 'Pathology', 'Pharmacology', 'Surgery', 'Medicine'];
const LEVELS = ['All', 'beginner', 'intermediate', 'advanced'];

const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [animateIn, setAnimateIn] = useState(false);
  const { user } = useAuth();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCategory !== 'All') params.category = selectedCategory;
        if (selectedLevel !== 'All') params.level = selectedLevel;
        if (search.trim()) params.search = search;
        const { data } = await getCourses(params);
        setCourses(data.courses || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load courses');
      } finally {
        setLoading(false);
        setTimeout(() => setAnimateIn(true), 50);
      }
    };
    const timer = setTimeout(fetchCourses, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedLevel]);

  const clearFilters = () => { setSelectedCategory('All'); setSelectedLevel('All'); setSearch(''); };
  const hasFilters = search || selectedCategory !== 'All' || selectedLevel !== 'All';
  const totalDuration = courses.reduce((s, c) => s + (c.estimatedDuration || 0), 0);

  return (
    <Box bg={bgColor} minH="100vh">
      {/* ══════ HERO ══════ */}
      <Box bgGradient="linear(135deg, #319795 0%, #2C7A7B 50%, #285E61 100%)" color="white"
        position="relative" overflow="hidden" pt={10} pb={14} borderBottomRadius="2xl" mb={8}>
        <Box position="absolute" top="-50px" right="-30px" w="200px" h="200px" borderRadius="full" bg="whiteAlpha.10" pointerEvents="none" />
        <Box position="absolute" bottom="-30px" left="-20px" w="140px" h="140px" borderRadius="full" bg="whiteAlpha.50" pointerEvents="none" />
        <Container maxW="1400px" position="relative" zIndex={1}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={animateIn ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
            <Flex align="center" gap={4} mb={6}>
              <Box bg="whiteAlpha.200" p={3} borderRadius="xl"><FiBookOpen size={28} /></Box>
              <Box>
                <Heading size="xl" fontWeight="bold">Courses</Heading>
                <Text fontSize="md" opacity={0.9}>Browse our medical course library</Text>
              </Box>
            </Flex>
          </motion.div>
          <Flex gap={4} wrap="wrap">
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{loading ? '—' : courses.length}</Text>
              <Text fontSize="xs" opacity={0.8}>Courses</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{loading ? '—' : Math.round(totalDuration / 60)}h</Text>
              <Text fontSize="xs" opacity={0.8}>Total Hours</Text>
            </Box>
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="xl">
              <Text fontSize="2xl" fontWeight="bold">{CATEGORIES.length - 1}</Text>
              <Text fontSize="xs" opacity={0.8}>Categories</Text>
            </Box>
          </Flex>
        </Container>
      </Box>

      <Container maxW="1400px" pb={12}>
        {/* Search + Filters */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={6} wrap="wrap">
          <InputGroup maxW={{ md: '300px' }}>
            <InputLeftElement pointerEvents="none"><FiSearch color="gray.400" /></InputLeftElement>
            <Input placeholder="Search courses..." value={search}
              onChange={e => setSearch(e.target.value)} borderRadius="full" bg={cardBg} />
          </InputGroup>
          <HStack spacing={3}>
            <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              size="sm" borderRadius="full" w="140px" bg={cardBg}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
            <Select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
              size="sm" borderRadius="full" w="130px" bg={cardBg}>
              {LEVELS.map(lv => <option key={lv} value={lv}>{lv === 'All' ? 'All levels' : lv}</option>)}
            </Select>
          </HStack>
        </Flex>

        {/* Active filters */}
        {hasFilters && (
          <Wrap spacing={2} mb={6}>
            {search && <Tag size="sm" borderRadius="full" colorScheme="teal"><TagLabel>Search: {search}</TagLabel><TagCloseButton onClick={() => setSearch('')} /></Tag>}
            {selectedCategory !== 'All' && <Tag size="sm" borderRadius="full" colorScheme="teal" variant="subtle"><TagLabel>{selectedCategory}</TagLabel><TagCloseButton onClick={() => setSelectedCategory('All')} /></Tag>}
            {selectedLevel !== 'All' && <Tag size="sm" borderRadius="full" colorScheme="teal" variant="subtle"><TagLabel>{selectedLevel}</TagLabel><TagCloseButton onClick={() => setSelectedLevel('All')} /></Tag>}
            <Button size="xs" variant="ghost" colorScheme="teal" onClick={clearFilters}>Clear all</Button>
          </Wrap>
        )}

        {/* Results */}
        {loading ? (
          <Box textAlign="center" py={20}><Spinner size="xl" color="teal.500" /></Box>
        ) : error ? (
          <Alert status="error" borderRadius="xl"><AlertIcon /> {error}</Alert>
        ) : courses.length === 0 ? (
          <Box textAlign="center" py={20} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Icon as={FiBookOpen} boxSize={16} color="gray.300" mb={4} />
            <Heading size="md" mb={2}>No courses found</Heading>
            <Text color="gray.500">Try different filters</Text>
          </Box>
        ) : (
          <>
            <Text fontSize="sm" color="gray.500" mb={4}>{courses.length} course{courses.length !== 1 ? 's' : ''}</Text>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={5}
              as={motion.div} variants={containerVariant} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
              {courses.map((course, i) => {
                const instructorId = course.instructorId?._id || course.instructorId;
                const isOwned = instructorId?.toString() === user?._id?.toString();
                return <CourseCard key={course._id} course={course} owned={isOwned} index={i} />;
              })}
            </SimpleGrid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default CoursesPage;
