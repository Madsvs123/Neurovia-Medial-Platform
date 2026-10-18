import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, Badge, Spinner, Alert, AlertIcon,
  SimpleGrid, FormControl, FormLabel, Input, Textarea, Select,
  useColorModeValue, useToast, IconButton, Divider, VStack, HStack,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
  Table, Thead, Tbody, Tr, Th, Td,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiSave, FiPlus, FiEdit2, FiTrash2, FiVideo,
  FiBookOpen, FiClock, FiDollarSign, FiEye, FiEyeOff,
} from 'react-icons/fi';
import {
  getCourseById, updateCourse, deleteCourse, toggleCoursePublish,
  getLessonsByCourse, deleteLesson, reorderLessons, toggleLessonPublish,
  getPrograms,
} from '../services/api';
import dayjs from 'dayjs';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname.endsWith('/edit');
  const toast = useToast();
  const { isOpen: deleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => { if (id) fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [courseRes, lessonsRes] = await Promise.all([
        getCourseById(id),
        getLessonsByCourse(id),
      ]);
      const [progRes] = await Promise.all([getPrograms({ limit: 100 }).catch(() => ({ data: { programs: [] } }))]);
      setPrograms(progRes.data.programs || []);
      const c = courseRes.data.course || courseRes.data;
      setCourse(c);
      setLessons(lessonsRes.data.lessons || []);
      setForm({
        title: c.title || '',
        description: c.description || '',
        category: c.category || '',
        specialty: c.specialty || '',
        level: c.level || 'beginner',
        price: c.price?.toString() || '0',
        language: c.language || 'en',
        videoUrl: c.videoUrl || '',
        programId: c.programId || '',
        estimatedDuration: c.estimatedDuration?.toString() || '',
        tags: c.tags?.join(', ') || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      await updateCourse(id, payload);
      toast({ title: 'Course updated', status: 'success', duration: 3000 });
      navigate(`/admin/courses/${id}`);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      await toggleCoursePublish(id);
      toast({ title: `Course ${course.published ? 'unpublished' : 'published'}`, status: 'success', duration: 3000 });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCourse(id);
      toast({ title: 'Course deleted', status: 'success', duration: 3000 });
      navigate('/admin/courses');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
    onDeleteClose();
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await deleteLesson(lessonId);
      toast({ title: 'Lesson deleted', status: 'success', duration: 3000 });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const handleToggleLessonPublish = async (lessonId) => {
    try {
      await toggleLessonPublish(lessonId);
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const handleLessonUp = async (index) => {
    if (index === 0) return;
    const newOrder = [...lessons];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    moveLesson(newOrder);
  };

  const handleLessonDown = async (index) => {
    if (index === lessons.length - 1) return;
    const newOrder = [...lessons];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    moveLesson(newOrder);
  };

  const moveLesson = async (newOrder) => {
    const lessonOrders = newOrder.map((l, i) => ({ lessonId: l._id, order: i }));
    try {
      await reorderLessons(id, lessonOrders);
      setLessons(newOrder.map((l, i) => ({ ...l, order: i })));
      toast({ title: 'Lessons reordered', status: 'success', duration: 2000 });
    } catch (err) {
      fetchData();
      toast({ title: 'Error reordering', status: 'error', duration: 3000 });
    }
  };

  const getLevelColor = (lvl) => {
    switch (lvl) {
      case 'beginner': return 'green';
      case 'intermediate': return 'orange';
      case 'advanced': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return <Flex justify="center" align="center" minH="300px"><Spinner size="xl" color="teal.500" /></Flex>;
  }

  if (error) {
    return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  }

  if (!course) return null;

  return (
    <Box>
      {/* Header */}
      <Flex align="center" gap={4} mb={6} flexWrap="wrap">
        <IconButton icon={<FiArrowLeft />} variant="ghost" onClick={() => navigate('/admin/courses')} aria-label="Back" />
        <Box flex={1}>
          <Flex align="center" gap={3}>
            <Heading size="lg">{course.title}</Heading>
            <Badge colorScheme={getLevelColor(course.level)}>{course.level}</Badge>
            <Badge colorScheme={course.published ? 'green' : 'gray'}>
              {course.published ? 'Published' : 'Draft'}
            </Badge>
          </Flex>
          <Text color="gray.500" mt={1}>{course.specialty} / {course.category}</Text>
        </Box>
        <Flex gap={2}>
          <Button size="sm" variant="outline" colorScheme={course.published ? 'orange' : 'green'}
            onClick={handleTogglePublish}
            leftIcon={course.published ? <FiEyeOff /> : <FiEye />}>
            {course.published ? 'Unpublish' : 'Publish'}
          </Button>
          <Button size="sm" colorScheme="red" variant="outline" leftIcon={<FiTrash2 />} onClick={onDeleteOpen}>
            Delete
          </Button>
        </Flex>
      </Flex>

      <Tabs variant="soft-rounded" colorScheme="teal">
        <TabList mb={6}>
          <Tab>Course Details</Tab>
          <Tab>Lessons ({lessons.length})</Tab>
        </TabList>

        <TabPanels>
          {/* Course Details Tab */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* Info Card */}
              <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
                <Heading size="md" mb={6}>Course Info</Heading>
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between">
                    <Text color="gray.500">Enrollments</Text>
                    <Text fontWeight="medium">{course.enrollmentCount || 0}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Rating</Text>
                    <Text fontWeight="medium">{course.rating ? `${course.rating} / 5` : 'Not rated'}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Price</Text>
                    <Text fontWeight="medium">{course.price === 0 ? 'Free' : `$${course.price}`}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Duration</Text>
                    <Text fontWeight="medium">{course.estimatedDuration ? `${course.estimatedDuration} min` : '—'}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Language</Text>
                    <Text fontWeight="medium">{course.language?.toUpperCase() || 'EN'}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Instructor</Text>
                    <Text fontWeight="medium">{course.instructorId?.username || '—'}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Program</Text>
                    <Badge colorScheme={course.programId ? 'purple' : 'gray'}>
                      {course.programId?.title || 'None'}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Intro Video</Text>
                    <Badge colorScheme={course.videoUrl ? 'green' : 'gray'}>
                      {course.videoUrl ? 'Yes' : 'No'}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Created</Text>
                    <Text fontWeight="medium">{dayjs(course.createdAt).format('MMM D, YYYY')}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.500">Updated</Text>
                    <Text fontWeight="medium">{dayjs(course.updatedAt).format('MMM D, YYYY')}</Text>
                  </Flex>
                </VStack>
                {course.tags?.length > 0 && (
                  <Box mt={4}>
                    <Text color="gray.500" fontSize="sm" mb={2}>Tags</Text>
                    <Flex gap={2} flexWrap="wrap">
                      {course.tags.map((tag, i) => (
                        <Badge key={i} variant="subtle" colorScheme="teal">{tag}</Badge>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Box>

              {/* Edit Form */}
              <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
                <Heading size="md" mb={6}>Edit Course</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Title</FormLabel>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </FormControl>
                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl>
                      <FormLabel>Category</FormLabel>
                      <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Specialty</FormLabel>
                      <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                    </FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4}>
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
                  <SimpleGrid columns={2} spacing={4}>
                    <FormControl>
                      <FormLabel>Price ($)</FormLabel>
                      <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Est. Duration (min)</FormLabel>
                      <Input type="number" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} />
                    </FormControl>
                  </SimpleGrid>
                  <FormControl>
                    <FormLabel>Program (optional)</FormLabel>
                    <Select value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })}>
                      <option value="">No program</option>
                      {programs.map((p) => (
                        <option key={p._id} value={p._id}>{p.title}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Intro Video URL</FormLabel>
                    <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://example.com/video.mp4 or /api/uploads/..." />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Tags (comma separated)</FormLabel>
                    <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cardiology, ecg, heart" />
                  </FormControl>
                  <Button colorScheme="teal" leftIcon={<FiSave />} onClick={handleSave} isLoading={saving} mt={2}>
                    Save Changes
                  </Button>
                </VStack>
              </Box>
            </SimpleGrid>
          </TabPanel>

          {/* Lessons Tab */}
          <TabPanel px={0}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Lessons</Heading>
              <Button colorScheme="teal" size="sm" leftIcon={<FiPlus />}
                onClick={() => navigate(`/admin/courses/${id}/lessons/new`)}>
                Add Lesson
              </Button>
            </Flex>

            {lessons.length === 0 ? (
              <Box bg={cardBg} p={10} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                textAlign="center" color="gray.400">
                No lessons yet. Click "Add Lesson" to create the first one.
              </Box>
            ) : (
              <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead bg={theadBg}>
                      <Tr>
                        <Th width="50px">#</Th>
                        <Th>Title</Th>
                        <Th>Status</Th>
                        <Th>Read Time</Th>
                        <Th>Created</Th>
                        <Th textAlign="center">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {lessons.map((lesson, index) => (
                        <Tr key={lesson._id} _hover={{ bg: rowHover }}>
                          <Td>
                            <Flex direction="column" align="center" gap={1}>
                              <Text fontWeight="bold" fontSize="lg">{index + 1}</Text>
                              <HStack spacing={1}>
                                <IconButton
                                  icon={<span>▲</span>} size="xs" variant="ghost"
                                  onClick={() => handleLessonUp(index)}
                                  isDisabled={index === 0}
                                  aria-label="Move up"
                                />
                                <IconButton
                                  icon={<span>▼</span>} size="xs" variant="ghost"
                                  onClick={() => handleLessonDown(index)}
                                  isDisabled={index === lessons.length - 1}
                                  aria-label="Move down"
                                />
                              </HStack>
                            </Flex>
                          </Td>
                          <Td>
                            <Flex align="center" gap={2}>
                              <Text fontWeight="medium">{lesson.title}</Text>
                              {lesson.videoUrl && (
                                <Badge colorScheme="teal" variant="subtle" fontSize="xs">
                                  <FiVideo size={12} style={{ display: 'inline', marginRight: 2 }} />Video
                                </Badge>
                              )}
                            </Flex>
                          </Td>
                          <Td>
                            <Badge colorScheme={lesson.published ? 'green' : 'gray'}>
                              {lesson.published ? 'Published' : 'Draft'}
                            </Badge>
                          </Td>
                          <Td>
                            <Flex align="center" gap={1}>
                              <FiClock size={12} />
                              <Text fontSize="sm">{lesson.estimatedReadTime || '—'} min</Text>
                            </Flex>
                          </Td>
                          <Td>
                            <Text fontSize="sm">{dayjs(lesson.createdAt).format('MMM D')}</Text>
                          </Td>
                          <Td>
                            <Flex justify="center" gap={2}>
                              <IconButton size="sm" variant="ghost" colorScheme="blue"
                                icon={<FiEdit2 />}
                                onClick={() => navigate(`/admin/courses/${id}/lessons/${lesson._id}`)}
                                aria-label="Edit" />
                              <IconButton size="sm" variant="ghost"
                                colorScheme={lesson.published ? 'orange' : 'green'}
                                icon={lesson.published ? <FiEyeOff /> : <FiEye />}
                                onClick={() => handleToggleLessonPublish(lesson._id)}
                                aria-label="Toggle publish" />
                              <IconButton size="sm" variant="ghost" colorScheme="red"
                                icon={<FiTrash2 />}
                                onClick={() => handleDeleteLesson(lesson._id)}
                                aria-label="Delete" />
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Course</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete <strong>"{course.title}"</strong>? All lessons will be permanently removed.
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onDeleteClose}>Cancel</Button>
            <Button colorScheme="red" onClick={handleDelete}>Delete Course</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CourseDetail;
