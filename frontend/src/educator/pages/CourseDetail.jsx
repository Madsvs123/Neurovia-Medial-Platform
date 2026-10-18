import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, useToast, IconButton, Divider, Icon, HStack,
  VStack, SimpleGrid, Card, CardBody, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Textarea, Select
} from '@chakra-ui/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiBookOpen, FiVideo, FiFileText, FiPlay, FiEye, FiToggleLeft, FiToggleRight, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { getCourseById, updateCourse, getLessonsByCourse, createLesson, updateLesson, deleteLesson, toggleLessonPublish } from '../services/api';
import dayjs from 'dayjs';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');

  const [form, setForm] = useState({ title: '', content: '', videoUrl: '', videoDescription: '', estimatedReadTime: '', order: 1 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [courseRes, lessonRes] = await Promise.all([
          getCourseById(id),
          getLessonsByCourse(id),
        ]);
        setCourse(courseRes.data.course);
        setLessons((lessonRes.data.lessons || []).sort((a, b) => a.order - b.order));
      } catch (err) {
        setError('Failed to load course');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const openCreateLesson = () => {
    setEditingLesson(null);
    setForm({ title: '', content: '', videoUrl: '', videoDescription: '', estimatedReadTime: '', order: lessons.length + 1 });
    onOpen();
  };

  const openEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title, content: lesson.content || '',
      videoUrl: lesson.videoUrl || '', videoDescription: lesson.videoDescription || '',
      estimatedReadTime: lesson.estimatedReadTime?.toString() || '',
      order: lesson.order,
    });
    onOpen();
  };

  const handleSaveLesson = async () => {
    if (!form.title || !form.content) { toast({ title: 'Title and content required', status: 'warning', duration: 3000 }); return; }
    setSaving(true);
    try {
      const payload = {
        courseId: id,
        title: form.title,
        content: form.content,
        videoUrl: form.videoUrl || undefined,
        videoDescription: form.videoDescription || undefined,
        estimatedReadTime: form.estimatedReadTime ? parseInt(form.estimatedReadTime) : undefined,
        order: parseInt(form.order) || lessons.length + 1,
      };
      if (editingLesson) {
        await updateLesson(editingLesson._id, payload);
        toast({ title: 'Lesson updated', status: 'success', duration: 2000 });
      } else {
        await createLesson(payload);
        toast({ title: 'Lesson created', status: 'success', duration: 2000 });
      }
      onClose();
      const { data } = await getLessonsByCourse(id);
      setLessons((data.lessons || []).sort((a, b) => a.order - b.order));
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); } finally { setSaving(false); }
  };

  const handleToggle = async (lesson) => {
    try { await toggleLessonPublish(lesson._id); const { data } = await getLessonsByCourse(id); setLessons((data.lessons || []).sort((a, b) => a.order - b.order)); toast({ title: lesson.published ? 'Unpublished' : 'Published', status: 'success', duration: 2000 }); } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); }
  };

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    try { await deleteLesson(lesson._id); const { data } = await getLessonsByCourse(id); setLessons((data.lessons || []).sort((a, b) => a.order - b.order)); toast({ title: 'Deleted', status: 'success', duration: 2000 }); } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); }
  };

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="blue.500" /></Flex>;
  if (error) return <Container py={20}><Alert status="error"><AlertIcon /> {error}</Alert></Container>;
  if (!course) return <Container py={20}><Alert status="info"><AlertIcon /> Course not found</Alert></Container>;

  return (
    <Box>
      {/* Header */}
      <Flex align="center" gap={3} mb={6}>
        <Button as={Link} to="/educator/courses" variant="ghost" size="sm" leftIcon={<FiArrowLeft />}>Back</Button>
        <Box flex="1" minW={0}>
          <Heading size="lg" noOfLines={1}>{course.title}</Heading>
          <HStack spacing={3} fontSize="sm" color="gray.500">
            <Badge colorScheme={course.published ? 'green' : 'gray'}>{course.published ? 'Published' : 'Draft'}</Badge>
            <Text>{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</Text>
            {course.level && <Badge colorScheme="blue">{course.level}</Badge>}
          </HStack>
        </Box>
      </Flex>

      {/* Lessons section */}
      <Box bg={cardBg} borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden">
        <Flex justify="space-between" align="center" px={5} py={4} borderBottom="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
          <Heading size="sm">Lessons</Heading>
          <Button size="sm" colorScheme="blue" leftIcon={<FiPlus />} onClick={openCreateLesson}>Add Lesson</Button>
        </Flex>

        {lessons.length === 0 ? (
          <Box textAlign="center" py={12} color="gray.400">
            <Icon as={FiBookOpen} boxSize={10} mb={3} />
            <Heading size="sm" mb={1}>No lessons yet</Heading>
            <Text fontSize="sm">Add your first lesson to this course</Text>
          </Box>
        ) : (
          <VStack spacing={0} align="stretch" divider={<Divider />}>
            {lessons.map((lesson, idx) => (
              <Box key={lesson._id} p={4} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }} transition="all 0.15s">
                <Flex align="center" gap={4}>
                  <Box bg="blue.50" p={2} borderRadius="md" flexShrink={0}>
                    <Icon as={FiBookOpen} boxSize={4} color="blue.500" />
                  </Box>
                  <Box flex="1" minW={0}>
                    <Flex align="center" gap={2}>
                      <Badge colorScheme="gray" borderRadius="full" fontSize="xs">#{lesson.order}</Badge>
                      <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{lesson.title}</Text>
                      <Badge colorScheme={lesson.published ? 'green' : 'gray'} borderRadius="full" fontSize="xs">{lesson.published ? 'Published' : 'Draft'}</Badge>
                    </Flex>
                    <HStack spacing={3} fontSize="xs" color="gray.500" mt={0.5}>
                      {lesson.videoUrl && <><FiVideo size={12} /><Text>Video</Text></>}
                      {lesson.estimatedReadTime && <><FiPlay size={12} /><Text>{lesson.estimatedReadTime} min read</Text></>}
                      {lesson.attachments?.length > 0 && <><FiFileText size={12} /><Text>{lesson.attachments.length} file{lesson.attachments.length > 1 ? 's' : ''}</Text></>}
                    </HStack>
                  </Box>
                  <Button size="xs" variant="ghost" leftIcon={<FiEdit2 />} onClick={() => openEditLesson(lesson)}>Edit</Button>
                  <Button size="xs" variant="ghost" colorScheme={lesson.published ? 'orange' : 'green'} leftIcon={lesson.published ? <FiToggleLeft /> : <FiToggleRight />} onClick={() => handleToggle(lesson)}>
                    {lesson.published ? 'Off' : 'On'}
                  </Button>
                  <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDeleteLesson(lesson)} aria-label="Delete" />
                  <Link to={`/educator/courses/${id}/lessons/${lesson._id}`}>
                    <Button size="xs" variant="outline" leftIcon={<FiEye />}>View</Button>
                  </Link>
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      {/* Lesson Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay /><ModalContent maxH="90vh">
          <ModalHeader>{editingLesson ? 'Edit Lesson' : 'New Lesson'}</ModalHeader><ModalCloseButton />
          <ModalBody overflowY="auto">
            <VStack spacing={4}>
              <FormControl isRequired><FormLabel>Title</FormLabel><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormControl>
              <FormControl isRequired><FormLabel>Content</FormLabel><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} minH="200px" placeholder="Lesson content (supports HTML/markdown)..." /></FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>Order</FormLabel><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></FormControl>
                <FormControl><FormLabel>Est. Read Time (min)</FormLabel><Input type="number" value={form.estimatedReadTime} onChange={(e) => setForm({ ...form, estimatedReadTime: e.target.value })} placeholder="e.g. 15" /></FormControl>
              </SimpleGrid>
              <FormControl><FormLabel>Video URL</FormLabel><Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=... or direct video URL" /></FormControl>
              <FormControl><FormLabel>Video Description</FormLabel><Textarea value={form.videoDescription} onChange={(e) => setForm({ ...form, videoDescription: e.target.value })} rows={2} placeholder="Brief description of the video content" /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleSaveLesson} isLoading={saving}>{editingLesson ? 'Update' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CourseDetail;
