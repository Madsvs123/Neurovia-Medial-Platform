import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, Spinner, Alert, AlertIcon,
  FormControl, FormLabel, Input, Textarea, Select,
  useColorModeValue, useToast, IconButton, VStack, SimpleGrid,
  Tag, TagLabel, TagCloseButton, HStack, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Divider,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiVideo } from 'react-icons/fi';
import { getLessonById, createLesson, updateLesson, getCourseById } from '../services/api';

const LessonEditor = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !lessonId || lessonId === 'new';

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newRef, setNewRef] = useState({ title: '', url: '' });

  const [form, setForm] = useState({
    title: '',
    content: '',
    order: '',
    estimatedReadTime: '',
    published: false,
    references: [],
    attachments: [],
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchCourse();
    if (!isNew) fetchLesson();
  }, [courseId, lessonId]);

  const fetchCourse = async () => {
    try {
      const { data } = await getCourseById(courseId);
      setCourse(data.course || data);
    } catch { /* course name is non-critical */ }
  };

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const { data } = await getLessonById(lessonId);
      const l = data.lesson || data;
      setForm({
        title: l.title || '',
        content: l.content || '',
        videoUrl: l.videoUrl || '',
        videoDescription: l.videoDescription || '',
        order: l.order?.toString() || '',
        estimatedReadTime: l.estimatedReadTime?.toString() || '',
        published: l.published || false,
        references: l.references || [],
        attachments: l.attachments || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast({ title: 'Title and content are required', status: 'warning', duration: 3000 });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        courseId,
        order: form.order ? parseInt(form.order) : 0,
        estimatedReadTime: form.estimatedReadTime ? parseInt(form.estimatedReadTime) : undefined,
      };

      if (isNew) {
        await createLesson(payload);
        toast({ title: 'Lesson created', status: 'success', duration: 3000 });
      } else {
        await updateLesson(lessonId, payload);
        toast({ title: 'Lesson updated', status: 'success', duration: 3000 });
      }
      navigate(`/admin/courses/${courseId}`);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const addReference = () => {
    if (!newRef.title || !newRef.url) return;
    setForm({ ...form, references: [...form.references, { ...newRef }] });
    setNewRef({ title: '', url: '' });
  };

  const removeReference = (index) => {
    setForm({ ...form, references: form.references.filter((_, i) => i !== index) });
  };

  if (loading) {
    return <Flex justify="center" align="center" minH="300px"><Spinner size="xl" color="teal.500" /></Flex>;
  }

  if (error && !isNew) {
    return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  }

  return (
    <Box maxW="900px">
      {/* Header */}
      <Flex align="center" gap={4} mb={6}>
        <IconButton icon={<FiArrowLeft />} variant="ghost"
          onClick={() => navigate(`/admin/courses/${courseId}`)} aria-label="Back" />
        <Box>
          <Heading size="lg">{isNew ? 'New Lesson' : 'Edit Lesson'}</Heading>
          <Text color="gray.500" mt={1}>
            Course: {course?.title || courseId}
          </Text>
        </Box>
      </Flex>

      <VStack spacing={6} align="stretch">
        {/* Main Content */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={6}>Lesson Content</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to ECG Interpretation" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Content</FormLabel>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={14} placeholder="Write the lesson content here..." />
            </FormControl>

            {/* Video Section */}
            <Box borderWidth="1px" borderRadius="lg" p={4} borderStyle="dashed" borderColor="teal.300">
              <Heading size="xs" mb={3} color="teal.600">
                <FiVideo style={{ display: 'inline', marginRight: 6 }} />
                Lesson Video (optional)
              </Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Video URL</FormLabel>
                  <Input value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    placeholder="https://example.com/lesson.mp4 or /api/uploads/video/..." />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Video Description</FormLabel>
                  <Input value={form.videoDescription}
                    onChange={(e) => setForm({ ...form, videoDescription: e.target.value })}
                    placeholder="Brief description of this video" />
                </FormControl>
              </SimpleGrid>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <FormControl>
                <FormLabel>Order</FormLabel>
                <NumberInput value={form.order} min={0}
                  onChange={(value) => setForm({ ...form, order: value })}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Est. Read Time (min)</FormLabel>
                <NumberInput value={form.estimatedReadTime} min={0}
                  onChange={(value) => setForm({ ...form, estimatedReadTime: value })}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={form.published ? 'published' : 'draft'}
                  onChange={(e) => setForm({ ...form, published: e.target.value === 'published' })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </VStack>
        </Box>

        {/* References */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={4}>References</Heading>
          <Flex gap={3} mb={4} direction={{ base: 'column', md: 'row' }}>
            <Input
              placeholder="Reference title"
              value={newRef.title}
              onChange={(e) => setNewRef({ ...newRef, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReference(); } }}
            />
            <Input
              placeholder="URL"
              value={newRef.url}
              onChange={(e) => setNewRef({ ...newRef, url: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReference(); } }}
            />
            <Button size="sm" onClick={addReference} flexShrink={0}>+ Add</Button>
          </Flex>
          {form.references.length === 0 ? (
            <Text color="gray.400" fontSize="sm">No references added yet</Text>
          ) : (
            <VStack spacing={2} align="stretch">
              {form.references.map((ref, i) => (
                <Flex key={i} align="center" gap={3} p={2} borderRadius="md"
                  bg={useColorModeValue('gray.50', 'gray.700')}>
                  <Box flex={1}>
                    <Text fontWeight="medium" fontSize="sm">{ref.title}</Text>
                    <Text fontSize="xs" color="blue.500" as="a" href={ref.url} target="_blank">{ref.url}</Text>
                  </Box>
                  <IconButton size="xs" variant="ghost" colorScheme="red"
                    icon={<span>✕</span>} onClick={() => removeReference(i)} aria-label="Remove" />
                </Flex>
              ))}
            </VStack>
          )}
        </Box>

        {/* Save */}
        <Button
          colorScheme="teal" size="lg" leftIcon={<FiSave />}
          onClick={handleSave} isLoading={saving} loadingText="Saving..."
          alignSelf="flex-end"
        >
          {isNew ? 'Create Lesson' : 'Save Changes'}
        </Button>
      </VStack>
    </Box>
  );
};

export default LessonEditor;
