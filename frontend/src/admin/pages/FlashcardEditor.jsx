import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, Spinner, Alert, AlertIcon,
  FormControl, FormLabel, Input, Textarea, Select,
  useColorModeValue, useToast, IconButton, VStack, SimpleGrid,
  Tag, TagLabel, TagCloseButton, HStack,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiCopy } from 'react-icons/fi';
import { getFlashcardById, createFlashcard, updateFlashcard } from '../services/api';

const FlashcardEditor = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !cardId || cardId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newTag, setNewTag] = useState('');

  const [form, setForm] = useState({
    topic: '',
    front: '',
    back: '',
    difficulty: 'medium',
    tags: [],
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    if (!isNew) fetchCard();
  }, [cardId]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      const { data } = await getFlashcardById(cardId);
      const c = data.flashcard || data;
      setForm({
        topic: c.topic || '',
        front: c.front || '',
        back: c.back || '',
        difficulty: c.difficulty || 'medium',
        tags: c.tags || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load flashcard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.front || !form.back || !form.topic) {
      toast({ title: 'Topic, front, and back are required', status: 'warning', duration: 3000 });
      return;
    }
    try {
      setSaving(true);
      if (isNew) {
        await createFlashcard(form);
        toast({ title: 'Flashcard created', status: 'success', duration: 3000 });
      } else {
        await updateFlashcard(cardId, form);
        toast({ title: 'Flashcard updated', status: 'success', duration: 3000 });
      }
      navigate('/admin/flashcards');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim() || form.tags.includes(newTag.trim())) return;
    setForm({ ...form, tags: [...form.tags, newTag.trim()] });
    setNewTag('');
  };

  const removeTag = (index) => {
    setForm({ ...form, tags: form.tags.filter((_, i) => i !== index) });
  };

  if (loading) {
    return <Flex justify="center" align="center" minH="300px"><Spinner size="xl" color="teal.500" /></Flex>;
  }

  if (error && !isNew) {
    return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  }

  return (
    <Box maxW="700px">
      <Flex align="center" gap={4} mb={6}>
        <IconButton icon={<FiArrowLeft />} variant="ghost"
          onClick={() => navigate('/admin/flashcards')} aria-label="Back" />
        <Box>
          <Heading size="lg">{isNew ? 'New Flashcard' : 'Edit Flashcard'}</Heading>
        </Box>
      </Flex>

      <VStack spacing={6} align="stretch">
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="md" mb={6}>Card Content</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Topic</FormLabel>
              <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Cardiology, Anatomy, Pharmacology" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Front (Question)</FormLabel>
              <Textarea value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })}
                rows={4} placeholder="What is the primary function of the left ventricle?"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Back (Answer)</FormLabel>
              <Textarea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })}
                rows={4} placeholder="To pump oxygenated blood into the aorta for systemic circulation..."
              />
            </FormControl>

            {/* Preview */}
            {(form.front || form.back) && (
              <Box p={4} borderRadius="lg" bg={useColorModeValue('gray.100', 'gray.700')}>
                <Text fontWeight="bold" fontSize="sm" mb={2}>Preview</Text>
                <Box p={3} bg="white" borderRadius="md" shadow="sm" mb={2}>
                  <Text fontSize="sm" color="gray.500">Front:</Text>
                  <Text>{form.front || '—'}</Text>
                </Box>
                <Box p={3} bg="white" borderRadius="md" shadow="sm">
                  <Text fontSize="sm" color="gray.500">Back:</Text>
                  <Text>{form.back || '—'}</Text>
                </Box>
              </Box>
            )}

            <FormControl>
              <FormLabel>Difficulty</FormLabel>
              <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tags</FormLabel>
              <HStack mb={2}>
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag" size="sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                <Button size="sm" onClick={addTag}>+</Button>
              </HStack>
              <Flex wrap="wrap" gap={2}>
                {form.tags.map((tag, i) => (
                  <Tag key={i} size="md" colorScheme="teal" borderRadius="full">
                    <TagLabel>{tag}</TagLabel>
                    <TagCloseButton onClick={() => removeTag(i)} />
                  </Tag>
                ))}
              </Flex>
            </FormControl>
          </VStack>
        </Box>

        <Button colorScheme="teal" size="lg" leftIcon={<FiSave />}
          onClick={handleSave} isLoading={saving} loadingText="Saving..."
          alignSelf="flex-end">
          {isNew ? 'Create Flashcard' : 'Save Changes'}
        </Button>
      </VStack>
    </Box>
  );
};

export default FlashcardEditor;
