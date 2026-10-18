import React, { useState, useEffect } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, useToast, IconButton, Divider, Icon,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Textarea, Select, HStack
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FiPackage, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiEye, FiArrowRight } from 'react-icons/fi';
import { getMyCourses, createCourse, updateCourse, toggleCoursePublish, deleteCourse } from '../services/api';
import dayjs from 'dayjs';

const LEVEL_COLORS = { beginner: 'green', intermediate: 'orange', advanced: 'red' };

const Courses = () => {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cardBg = useColorModeValue('white', 'gray.800');
  const [form, setForm] = useState({ title: '', description: '', category: '', specialty: '', level: 'beginner' });

  const fetchData = async () => {
    try { setLoading(true); const { data } = await getMyCourses(); setCourses(data.courses || []); } catch (e) { setError('Failed to load courses'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ title: '', description: '', category: '', specialty: '', level: 'beginner' }); onOpen(); };
  const openEdit = (c) => { setEditing(c); setForm({ title: c.title, description: c.description || '', category: c.category || '', specialty: c.specialty || '', level: c.level || 'beginner' }); onOpen(); };

  const handleSave = async () => {
    if (!form.title) { toast({ title: 'Title required', status: 'warning', duration: 3000 }); return; }
    setSaving(true);
    try {
      if (editing) { await updateCourse(editing._id, form); toast({ title: 'Updated', status: 'success', duration: 2000 }); }
      else { await createCourse(form); toast({ title: 'Created', status: 'success', duration: 2000 }); }
      onClose(); fetchData();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); } finally { setSaving(false); }
  };

  const handleToggle = async (c) => { try { await toggleCoursePublish(c._id); fetchData(); toast({ title: c.published ? 'Unpublished' : 'Published', status: 'success', duration: 2000 }); } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); } };
  const handleDelete = async (c) => { if (!window.confirm(`Delete "${c.title}"?`)) return; try { await deleteCourse(c._id); toast({ title: 'Deleted', status: 'success', duration: 2000 }); fetchData(); } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); } };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box><Heading size="lg">My Courses</Heading><Text fontSize="sm" color="gray.500">{courses.length} courses</Text></Box>
        <Button colorScheme="blue" leftIcon={<FiPlus />} onClick={openCreate}>New Course</Button>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="blue.500" /></Flex>
        : courses.length === 0 ? <Box textAlign="center" py={16} color="gray.400"><Icon as={FiPackage} boxSize={12} mb={3} /><Heading size="md" mb={1}>No courses yet</Heading><Text fontSize="sm">Create your first course to get started</Text></Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {courses.map((c) => (
              <Box key={c._id} bg={cardBg} borderRadius="xl" borderWidth="1px" shadow="sm" overflow="hidden"
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box h="4px" bg={c.published ? 'blue.400' : 'gray.300'} />
                <Box p={4}>
                  <Flex justify="space-between" mb={1}>
                    <Badge colorScheme={LEVEL_COLORS[c.level] || 'gray'}>{c.level}</Badge>
                    <Badge colorScheme={c.published ? 'green' : 'gray'}>{c.published ? 'Published' : 'Draft'}</Badge>
                  </Flex>
                  <Heading size="sm" noOfLines={1}>{c.title}</Heading>
                  <Text fontSize="xs" color="gray.500" noOfLines={1} mt={1}>{c.specialty || ''} {c.category ? `· ${c.category}` : ''}</Text>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button as={Link} to={`/educator/courses/${c._id}`} size="xs" flex={1} variant="outline" leftIcon={<FiEye />}>Manage</Button>
                    <Button size="xs" variant="outline" leftIcon={<FiEdit2 />} onClick={() => openEdit(c)}>Edit</Button>
                    <Button size="xs" variant="outline" colorScheme={c.published ? 'orange' : 'green'}
                      leftIcon={c.published ? <FiToggleLeft /> : <FiToggleRight />} onClick={() => handleToggle(c)}>
                      {c.published ? 'Off' : 'On'}
                    </Button>
                    <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(c)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay /><ModalContent>
          <ModalHeader>{editing ? 'Edit Course' : 'New Course'}</ModalHeader><ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={4}><FormLabel>Title</FormLabel><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormControl>
            <FormControl mb={4}><FormLabel>Description</FormLabel><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></FormControl>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl><FormLabel>Category</FormLabel><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Specialty</FormLabel><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Level</FormLabel><Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </Select></FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>{editing ? 'Update' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Courses;
