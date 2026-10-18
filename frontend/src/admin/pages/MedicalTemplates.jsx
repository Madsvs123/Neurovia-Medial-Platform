import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, IconButton, useColorModeValue, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Switch, Divider, Select, Input, InputGroup, Stat, StatLabel, StatNumber,
  Tag, Wrap, Tabs, TabList, TabPanels, Tab, TabPanel, Accordion, AccordionItem, HStack,
  AccordionButton, AccordionPanel, AccordionIcon, NumberInput, NumberInputField,
  Collapse, Menu, MenuButton, MenuList, MenuItem, Editable, EditablePreview, EditableInput,
} from '@chakra-ui/react';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiFileText, FiCopy, FiEye,
  FiLayers, FiHash, FiList, FiSearch, FiFilter,
} from 'react-icons/fi';
import {
  getMedicalTemplates, createMedicalTemplate, updateMedicalTemplate, deleteMedicalTemplate,
} from '../services/api';
import dayjs from 'dayjs';

const MedicalTemplates = () => {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgMode = useColorModeValue('gray.100', 'gray.700');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: previewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('history');

  const emptyForm = () => ({
    title: '', specialty: '', templateType: 'history', category: '', content: '',
    sections: [], tags: '', public: true,
  });

  const [form, setForm] = useState(emptyForm());

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getMedicalTemplates({ limit: 100 });
      setTemplates(data.medicalTemplates || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm()); onOpen(); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title || '', specialty: t.specialty || '', templateType: t.templateType || 'history',
      category: t.category || '',
      content: t.content || '',
      sections: t.sections?.length ? t.sections : [],
      tags: Array.isArray(t.tags) ? t.tags.join(', ') : t.tags || '',
      public: t.public ?? true,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast({ title: 'Title and content required', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      const payload = {
        ...form,
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        sections: form.sections,
      };
      if (editing) { await updateMedicalTemplate(editing._id, payload); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      else { await createMedicalTemplate(payload); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      onClose(); fetchTemplates();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    try { await deleteMedicalTemplate(t._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchTemplates(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const openPreview = (t) => {
    setPreviewText(t.content);
    onPreviewOpen();
  };

  const addSection = () => {
    setForm(f => ({
      ...f,
      sections: [...(f.sections || []), { heading: '', body: '', order: (f.sections || []).length }],
    }));
  };

  const updateSection = (idx, field, value) => {
    const updated = [...(form.sections || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(f => ({ ...f, sections: updated }));
  };

  const removeSection = (idx) => {
    setForm(f => ({ ...f, sections: (f.sections || []).filter((_, i) => i !== idx) }));
  };

  const typeOptions = ['history', 'examination', 'soap', 'note', 'referral', 'discharge', 'prescription', 'procedure'];
  const typeColor = {
    history: 'blue', examination: 'green', soap: 'purple', note: 'orange',
    referral: 'cyan', discharge: 'red', prescription: 'pink', procedure: 'teal',
  };

  const filtered = templates.filter(t =>
    (search === '' || t.title?.toLowerCase().includes(search.toLowerCase()) ||
     t.specialty?.toLowerCase().includes(search.toLowerCase()) ||
     t.templateType?.toLowerCase().includes(search.toLowerCase())) &&
    (typeFilter === 'all' || t.templateType === typeFilter)
  );

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}><FiFileText /> Medical Templates</Heading>
          <Text color="gray.500" mt={1}>{templates.length} templates</Text>
        </Box>
        <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openCreate}>New Template</Button>
      </Flex>

      {/* Filters */}
      <Flex gap={3} mb={4} align="center" direction={{ base: 'column', md: 'row' }}>
        <InputGroup maxW="300px">
          <Input
            placeholder="Search templates..."
            size="sm" value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </InputGroup>
        <Select size="sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} maxW="200px">
          <option value="all">All Types</option>
          {typeOptions.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </Select>
        <IconButton icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={fetchTemplates} aria-label="Refresh" />
        <Text fontSize="sm" color="gray.500">{filtered.length} of {templates.length}</Text>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? <Box textAlign="center" py={20} color="gray.400">No templates</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
            {filtered.map(t => (
              <Box key={t._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s" display="flex" flexDirection="column">
                <Box h="5px" bgGradient={t.public ? 'linear(to-r, purple.300, purple.500)' : 'linear(to-r, gray.300, gray.400)'} />
                <Box p={5} display="flex" flexDirection="column" flex={1}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Box flex={1} minW={0}>
                      <Heading size="sm" noOfLines={1}>{t.title}</Heading>
                    </Box>
                    <Badge colorScheme={typeColor[t.templateType] || 'gray'} fontSize="xs" ml={2} flexShrink={0}>
                      {t.templateType}
                    </Badge>
                  </Flex>
                  <Flex gap={2} mb={2} flexWrap="wrap">
                    {t.specialty && <Badge variant="subtle" colorScheme="purple" fontSize="xs">{t.specialty}</Badge>}
                    {t.category && <Badge variant="subtle" colorScheme="cyan" fontSize="xs">{t.category}</Badge>}
                    <Badge colorScheme={t.public ? 'green' : 'gray'} variant="subtle" fontSize="xs">
                      {t.public ? 'Public' : 'Private'}
                    </Badge>
                    {t.sections?.length > 0 && <Badge variant="subtle" colorScheme="orange" fontSize="xs">{t.sections.length} sections</Badge>}
                    {t.version && <Badge variant="outline" fontSize="xs">v{t.version}</Badge>}
                  </Flex>
                  <Box bg={bgMode} p={3} borderRadius="md" mb={3} flex={1} maxH="160px" overflow="hidden">
                    <Text fontSize="xs" fontFamily="monospace" whiteSpace="pre-wrap" noOfLines={6}>{t.content}</Text>
                  </Box>
                  {t.tags?.length > 0 && (
                    <Wrap spacing={1} mb={2}>
                      {t.tags.map((tag, i) => <Tag key={i} size="sm" variant="subtle" colorScheme="gray">{tag}</Tag>)}
                    </Wrap>
                  )}
                  <Flex justify="space-between" fontSize="xs" color="gray.400" mb={3}>
                    <span>by {t.createdBy?.username || '—'} · {dayjs(t.createdAt).format('MMM D, YYYY')}</span>
                  </Flex>
                  <Divider mb={3} />
                  <Flex gap={2}>
                    <Button size="sm" variant="outline" leftIcon={<FiEye />} onClick={() => openPreview(t)}>Preview</Button>
                    <Button size="sm" variant="outline" leftIcon={<FiEdit2 />} onClick={() => openEdit(t)}>Edit</Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(t)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      {/* Preview Modal */}
      <Modal isOpen={previewOpen} onClose={onPreviewClose} size="lg" scrollBehavior="inside">
        <ModalOverlay /><ModalContent>
          <ModalHeader>Preview</ModalHeader><ModalCloseButton />
          <ModalBody>
            <Box bg={bgMode} p={4} borderRadius="md">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}>
                {previewText}
              </pre>
            </Box>
          </ModalBody>
          <ModalFooter><Button variant="ghost" onClick={onPreviewClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit/Create Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay /><ModalContent maxW="800px">
          <ModalHeader>{editing ? 'Edit' : 'New'} Template</ModalHeader><ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Title</FormLabel>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Complete Neurological Exam" />
                </FormControl>
                <FormControl><FormLabel>Specialty</FormLabel>
                  <Input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} placeholder="Neurology" />
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Select value={form.templateType} onChange={e => setForm({...form, templateType: e.target.value})}>
                    {typeOptions.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="General Examination" />
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>Tags (comma separated)</FormLabel>
                  <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="neurology, exam, cranial-nerves" />
                </FormControl>
                <FormControl display="flex" alignItems="flex-end" pb={2}>
                  <HStack><FormLabel mb={0}>Public</FormLabel><Switch isChecked={form.public} onChange={e => setForm({...form, public: e.target.checked})} /></HStack>
                </FormControl>
              </SimpleGrid>

              {/* Content */}
              <FormControl isRequired>
                <FormLabel>Content</FormLabel>
                <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={8}
                  placeholder={'Mental status: [alert/lethargic]\nCN II: [intact/abnormal]\nMotor: [5/5 all]\nSensory: [intact]\nReflexes: [2+ symmetric]\nCoordination: [intact]'}
                  fontFamily="monospace" fontSize="sm" />
              </FormControl>

              {/* Sections */}
              <Box w="full">
                <Flex justify="space-between" align="center" mb={2}>
                  <Heading size="xs" display="flex" alignItems="center" gap={2}><FiLayers /> Sections</Heading>
                  <Button size="xs" leftIcon={<FiPlus />} onClick={addSection}>Add</Button>
                </Flex>
                {(!form.sections || form.sections.length === 0) && (
                  <Text fontSize="xs" color="gray.400" mb={2}>No sections defined — use the content field above</Text>
                )}
                {form.sections?.map((sec, idx) => (
                  <Box key={idx} bg={bgMode} p={3} borderRadius="md" mb={2}>
                    <Flex gap={2} mb={2}>
                      <Input size="xs" placeholder="Section heading" value={sec.heading}
                        onChange={e => updateSection(idx, 'heading', e.target.value)} flex={1} />
                      <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />}
                        onClick={() => removeSection(idx)} aria-label="Remove" />
                    </Flex>
                    <Textarea size="xs" rows={2} placeholder="Section body text..."
                      value={sec.body} onChange={e => updateSection(idx, 'body', e.target.value)} fontSize="xs" />
                  </Box>
                ))}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSave} isLoading={saving}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MedicalTemplates;
