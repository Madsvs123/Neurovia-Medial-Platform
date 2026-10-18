import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Textarea, VStack, HStack,
} from '@chakra-ui/react';
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiEye, FiRefreshCw,
  FiVideo, FiBookOpen, FiClock, FiDollarSign, FiGlobe,
} from 'react-icons/fi';
import { getCourses, createCourse, deleteCourse } from '../services/api';
import dayjs from 'dayjs';

const Courses = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // New course form
  const [form, setForm] = useState({
    title: '', description: '', category: '', specialty: '',
    level: 'beginner', price: '', language: 'en', estimatedDuration: '',
  });
  const [saving, setSaving] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getCourses({ limit: 100 });
      setCourses(data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.category || !form.specialty) {
      toast({ title: 'Please fill all required fields', status: 'warning', duration: 3000 });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        price: form.price ? parseFloat(form.price) : 0,
        estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : undefined,
      };
      const { data } = await createCourse(payload);
      toast({ title: 'Course created', status: 'success', duration: 3000 });
      onClose();
      setForm({ title: '', description: '', category: '', specialty: '', level: 'beginner', price: '', language: 'en', estimatedDuration: '', videoUrl: '' });
      fetchCourses();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete "${course.title}" and all its lessons?`)) return;
    try {
      await deleteCourse(course._id);
      toast({ title: 'Course deleted', status: 'success', duration: 3000 });
      fetchCourses();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const filtered = courses.filter((c) => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || c.level === levelFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'published' ? c.published : !c.published);
    return matchSearch && matchLevel && matchStatus;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'green';
      case 'intermediate': return 'orange';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  if (error && !loading) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon /> {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Courses</Heading>
          <Text color="gray.500" mt={1}>Total: {courses.length} courses</Text>
        </Box>
        <Flex gap={3}>
          <Tooltip label="Refresh" hasArrow>
            <IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchCourses} aria-label="Refresh" />
          </Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={onOpen}>
            New Course
          </Button>
        </Flex>
      </Flex>

      {/* Filters */}
      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} maxW={{ base: 'full', md: '150px' }}>
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} maxW={{ base: 'full', md: '150px' }}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </Flex>

      {/* Course Grid */}
      {loading ? (
        <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={20} color="gray.400">No courses found</Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filtered.map((course) => (
            <Box key={course._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
              shadow="sm" overflow="hidden" transition="all 0.25s"
              _hover={{ shadow: 'lg', transform: 'translateY(-3px)' }}>
              {/* Gradient stripe */}
              <Box h="5px" bgGradient={course.published
                ? 'linear(to-r, teal.300, teal.500)'
                : 'linear(to-r, gray.300, gray.400)'} />
              <Box p={5}>
                <Flex justify="space-between" align="start" mb={3}>
                  <Flex gap={2}>
                    <Badge colorScheme={getLevelColor(course.level)} fontSize="xs">{course.level}</Badge>
                    <Badge variant="subtle" colorScheme="purple" fontSize="xs">{course.specialty}</Badge>
                  </Flex>
                  <Badge colorScheme={course.published ? 'green' : 'gray'} fontSize="xs">
                    {course.published ? 'Published' : 'Draft'}</Badge>
                </Flex>
                <Heading size="sm" mb={1} noOfLines={2}>{course.title}</Heading>
                <Text fontSize="xs" color="gray.400" mb={2} noOfLines={1}>{course.category}</Text>
                <Text fontSize="sm" color="gray.500" noOfLines={2} mb={4}>{course.description}</Text>
                {/* Meta row */}
                <Flex flexWrap="wrap" gap={3} mb={3} fontSize="xs" color="gray.400">
                  {course.estimatedDuration && <Flex align="center" gap={1}><FiClock size={12} /> {course.estimatedDuration}min</Flex>}
                  <Flex align="center" gap={1}><FiDollarSign size={12} /> {course.price === 0 ? 'Free' : `$${course.price}`}</Flex>
                  <Flex align="center" gap={1}><FiGlobe size={12} /> {course.language?.toUpperCase()}</Flex>
                  {course.enrollmentCount > 0 && <Flex align="center" gap={1}>👥 {course.enrollmentCount}</Flex>}
                  {course.rating > 0 && <Flex align="center" gap={1}>⭐ {course.rating}</Flex>}
                  {course.videoUrl && <FiVideo size={14} color="#319795" title="Has intro video" />}
                </Flex>
                {course.programId && <Badge colorScheme="purple" fontSize="xs" mb={3}>{course.programId?.title || 'Program'}</Badge>}
                <Flex gap={2}>
                  <Button size="sm" variant="outline" flex={1} leftIcon={<FiEye />}
                    onClick={() => navigate(`/admin/courses/${course._id}`)}>View</Button>
                  <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />}
                    onClick={() => navigate(`/admin/courses/${course._id}/edit`)}>Edit</Button>
                  <IconButton size="sm" variant="ghost" colorScheme="red"
                    icon={<FiTrash2 />} onClick={() => handleDelete(course)} aria-label="Delete" />
                </Flex>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* New Course Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Course</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Category</FormLabel>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Cardiology" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Specialty</FormLabel>
                  <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Internal Medicine" />
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Level</FormLabel>
                  <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Language</FormLabel>
                  <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Price ($)</FormLabel>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0 = free" />
                </FormControl>
                <FormControl>
                  <FormLabel>Est. Duration (min)</FormLabel>
                  <Input type="number" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreate} isLoading={saving}>Create Course</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Courses;
