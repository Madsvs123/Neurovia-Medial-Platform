import React, { useState, useEffect } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Spinner, Badge, Flex,
  Button, useColorModeValue, useToast, IconButton, Icon,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, FormControl, FormLabel,
  Input, Select, Textarea, Tag, TagLabel, Wrap, WrapItem,
} from '@chakra-ui/react';
import { FiZap, FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import {
  getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard, getFlashcardStats
} from '../services/api';

const DIFFICULTY_COLORS = { easy: 'green', medium: 'orange', hard: 'red' };

const Flashcards = () => {
  const toast = useToast();
  const [flashcards, setFlashcards] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingCard, setEditingCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ topic: '', front: '', back: '', difficulty: 'medium', tags: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await getFlashcards({});
      setFlashcards(data.flashcards || []);
      try {
        const statsRes = await getFlashcardStats();
        setStats(statsRes.data.stats);
      } catch {}
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditingCard(null);
    setForm({ topic: '', front: '', back: '', difficulty: 'medium', tags: '' });
    onOpen();
  };

  const openEdit = (card) => {
    setEditingCard(card);
    setForm({
      topic: card.topic || '',
      front: card.front || '',
      back: card.back || '',
      difficulty: card.difficulty || 'medium',
      tags: (card.tags || []).join(', '),
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.topic || !form.front || !form.back) {
      toast({ title: 'Missing fields', description: 'Topic, Front, and Back are required', status: 'warning', duration: 2000 });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (editingCard) {
        await updateFlashcard(editingCard._id, payload);
        toast({ title: 'Flashcard updated', status: 'success', duration: 2000 });
      } else {
        await createFlashcard(payload);
        toast({ title: 'Flashcard created', status: 'success', duration: 2000 });
      }
      onClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save', status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm(`Delete flashcard "${card.topic}"?`)) return;
    try {
      await deleteFlashcard(card._id);
      toast({ title: 'Deleted', status: 'success', duration: 2000 });
      fetchData();
    } catch {
      toast({ title: 'Error', status: 'error', duration: 2000 });
    }
  };

  const filtered = flashcards.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.topic?.toLowerCase().includes(q)
      || c.front?.toLowerCase().includes(q)
      || c.back?.toLowerCase().includes(q)
      || (c.tags || []).some(t => t.toLowerCase().includes(q));
  });

  const getMasteryColor = (level) => {
    if (level >= 80) return 'green';
    if (level >= 50) return 'yellow';
    return 'gray';
  };

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Flashcards</Heading>
          <Text fontSize="sm" color="gray.500">{flashcards.length} cards</Text>
        </Box>
        <Flex gap={3} align="center">
          <Input
            placeholder="Search flashcards..."
            size="sm" maxW="220px" borderRadius="lg"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <Button colorScheme="orange" leftIcon={<FiPlus />} onClick={openNew}>
            New Flashcard
          </Button>
        </Flex>
      </Flex>

      {/* Stats bar */}
      {stats && (
        <Flex gap={4} mb={6} p={3} bg={cardBg} borderRadius="lg" borderWidth="1px" borderColor={borderColor} wrap="wrap">
          <Box textAlign="center" px={3}>
            <Text fontSize="2xl" fontWeight="bold">{stats.totalFlashcards}</Text>
            <Text fontSize="xs" color="gray.500">Total</Text>
          </Box>
          <Box textAlign="center" px={3}>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">{stats.dueFlashcards}</Text>
            <Text fontSize="xs" color="gray.500">Due for Review</Text>
          </Box>
          <Box textAlign="center" px={3}>
            <Text fontSize="2xl" fontWeight="bold" color="teal.500">{Math.round(stats.avgMastery)}%</Text>
            <Text fontSize="xs" color="gray.500">Avg Mastery</Text>
          </Box>
          <Box textAlign="center" px={3}>
            <Text fontSize="2xl" fontWeight="bold">{stats.topicsCount}</Text>
            <Text fontSize="xs" color="gray.500">Topics</Text>
          </Box>
        </Flex>
      )}

      {/* Content */}
      {loading ? (
        <Flex justify="center" py={20}><Spinner size="xl" color="orange.500" /></Flex>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={16} color="gray.400">
          <Icon as={FiZap} boxSize={12} mb={3} />
          <Heading size="md" mb={1}>{search ? 'No matching flashcards' : 'No flashcards yet'}</Heading>
          <Text fontSize="sm">Create your first flashcard to get started</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map((card) => (
            <Box
              key={card._id}
              bg={cardBg}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={borderColor}
              shadow="sm"
              overflow="hidden"
              _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <Box p={4}>
                <Flex justify="space-between" mb={2}>
                  <Badge colorScheme={DIFFICULTY_COLORS[card.difficulty]}>{card.difficulty}</Badge>
                  <Badge colorScheme={getMasteryColor(card.masteryLevel)}>
                    Mastery: {card.masteryLevel}%
                  </Badge>
                </Flex>

                <Heading size="sm" noOfLines={1} mb={1}>{card.topic}</Heading>

                <Box
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                  p={2}
                  mb={2}
                  minH="60px"
                >
                  <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={1}>FRONT</Text>
                  <Text fontSize="sm" noOfLines={3}>{card.front}</Text>
                </Box>

                <Box
                  bg="orange.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                  p={2}
                  mb={2}
                  minH="60px"
                >
                  <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={1}>BACK</Text>
                  <Text fontSize="sm" noOfLines={3}>{card.back}</Text>
                </Box>

                {card.tags && card.tags.length > 0 && (
                  <Wrap spacing={1} mb={2}>
                    {card.tags.map((tag, i) => (
                      <WrapItem key={i}>
                        <Tag size="sm" colorScheme="teal" borderRadius="full">
                          <TagLabel>{tag}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}

                <Flex justify="space-between" align="center" mt={2}>
                  <Text fontSize="xs" color="gray.400">
                    {card.reviewCount || 0} reviews
                  </Text>
                  <Flex gap={1}>
                    <Button size="xs" variant="ghost" leftIcon={<FiEdit2 />}
                      onClick={() => openEdit(card)}>Edit</Button>
                    <IconButton size="xs" variant="ghost" colorScheme="red"
                      icon={<FiTrash2 />} onClick={() => handleDelete(card)} aria-label="Delete" />
                  </Flex>
                </Flex>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>{editingCard ? 'Edit Flashcard' : 'New Flashcard'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={3}>
              <FormLabel fontSize="sm">Topic</FormLabel>
              <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Anatomy, Pharmacology, Cardiology" />
            </FormControl>
            <FormControl isRequired mb={3}>
              <FormLabel fontSize="sm">Front (Question)</FormLabel>
              <Textarea value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })}
                placeholder="The question or prompt" rows={3} />
            </FormControl>
            <FormControl isRequired mb={3}>
              <FormLabel fontSize="sm">Back (Answer)</FormLabel>
              <Textarea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })}
                placeholder="The answer or explanation" rows={3} />
            </FormControl>
            <Flex gap={3} mb={3}>
              <FormControl>
                <FormLabel fontSize="sm">Difficulty</FormLabel>
                <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Tags (comma-separated)</FormLabel>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. anatomy, heart" />
              </FormControl>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="orange" onClick={handleSave} isLoading={saving} loadingText="Saving...">
              {editingCard ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Flashcards;
