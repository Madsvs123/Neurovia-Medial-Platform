import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Divider, Tag, Wrap, Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon, Progress,
  InputRightElement,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiEye, FiBook, FiFilter, FiX } from 'react-icons/fi';
import { getDiseases, updateDisease, deleteDisease, createDisease } from '../../services/api';
// import { AI } from 'ai'; // Removed due to import error

// AI functionality removed due to import error
// const aiClient = new AI();
// const normalizeAiOutput = (result) => {
//   if (!result) return '';
//   if (typeof result.outputText === 'string') return result.outputText;
//   if (Array.isArray(result.output)) {
//     return result.output.map((item) => {
//       if (typeof item === 'string') return item;
//       return item?.content?.[0]?.text ?? '';
//     }).join('');
//   }
//   return JSON.stringify(result);
// };

const DiseasesPanel = ({ cardBg, borderColor }) => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  // const [aiSummary, setAiSummary] = useState('');
  // const [aiLoading, setAiLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [form, setForm] = useState({
    name: '', icd10Code: '', specialty: '', bodySystem: '', severity: 'acute',
    description: '', epidemiology: '', symptoms: '', causes: '', riskFactors: '',
    diagnosis: '', diagnosticTests: '', differentialDiagnosis: '', treatment: '',
    medications: '', prognosis: '', prevention: '', complications: '', redFlags: '',
    imageUrl: '', tags: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getDiseases({ limit: 200 });
      setItems(data.diseases || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const openNew = () => {
    setIsNew(true); setEditing(null);
    setForm({ name: '', icd10Code: '', specialty: '', bodySystem: '', severity: 'acute', description: '', epidemiology: '', symptoms: '', causes: '', riskFactors: '', diagnosis: '', diagnosticTests: '', differentialDiagnosis: '', treatment: '', medications: '', prognosis: '', prevention: '', complications: '', redFlags: '', imageUrl: '', tags: '' });
    onOpen();
  };

  const openEdit = (d) => {
    setIsNew(false); setEditing(d);
    setForm({
      name: d.name || '', icd10Code: d.icd10Code || '', specialty: d.specialty || '', bodySystem: d.bodySystem || '', severity: d.severity || 'acute',
      description: d.description || '', epidemiology: d.epidemiology || '',
      symptoms: Array.isArray(d.symptoms) ? d.symptoms.join('\n') : d.symptoms || '',
      causes: d.causes || '', riskFactors: Array.isArray(d.riskFactors) ? d.riskFactors.join('\n') : d.riskFactors || '',
      diagnosis: d.diagnosis || '', diagnosticTests: Array.isArray(d.diagnosticTests) ? d.diagnosticTests.join('\n') : '',
      differentialDiagnosis: Array.isArray(d.differentialDiagnosis) ? d.differentialDiagnosis.join('\n') : '',
      treatment: d.treatment || '', medications: Array.isArray(d.medications) ? d.medications.join('\n') : '',
      prognosis: d.prognosis || '', prevention: d.prevention || '', complications: d.complications || '',
      redFlags: Array.isArray(d.redFlags) ? d.redFlags.join('\n') : '',
      imageUrl: d.imageUrl || '', tags: Array.isArray(d.tags) ? d.tags.join(', ') : '',
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.specialty || !form.description) {
      toast({ title: 'Name, specialty, and description required', status: 'warning', duration: 3000 }); return;
    }
    const toArray = (v) => v.split('\n').map(s => s.trim()).filter(Boolean);
    try { setSaving(true);
      const payload = {
        ...form,
        symptoms: toArray(form.symptoms), riskFactors: toArray(form.riskFactors),
        diagnosticTests: toArray(form.diagnosticTests), differentialDiagnosis: toArray(form.differentialDiagnosis),
        medications: toArray(form.medications), redFlags: toArray(form.redFlags),
        tags: toArray(form.tags.replace(/,/g, '\n')),
      };
      if (isNew) { await createDisease(payload); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      else { await updateDisease(editing._id, payload); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      onClose(); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete "${d.name}" (${d.icd10Code || 'No ICD-10'})?`)) return;
    try { await deleteDisease(d._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  // const handleGenerateSummary = async (text) => {
  //   if (!text) return;
  //   setAiLoading(true);
  //   setAiSummary('');
  //   try {
  //     const response = await aiClient.chat.completions.create({
  //       model: 'gpt-4o-mini',
  //       messages: [{ role: 'user', content: `Summarize this medical reference entry for quick clinician review:\n\n${text}` }],
  //     });
  //     setAiSummary(normalizeAiOutput(response));
  //   } catch (err) {
  //     toast({ title: 'AI summary failed', description: err.message || 'Unable to generate summary', status: 'error', duration: 3000 });
  //   } finally {
  //     setAiLoading(false);
  //   }
  // };

  const filtered = items.filter((i) => {
    const ms = i.name?.toLowerCase().includes(search.toLowerCase()) || i.icd10Code?.toLowerCase().includes(search.toLowerCase());
    const msp = specialtyFilter === 'all' || i.specialty === specialtyFilter;
    const msv = severityFilter === 'all' || i.severity === severityFilter;
    return ms && msp && msv;
  });

  const severityColor = (s) => { switch (s) { case 'acute': return 'red'; case 'chronic': return 'orange'; case 'both': return 'purple'; default: return 'gray'; } };
  const uniqueSpecialties = [...new Set(items.map((i) => i.specialty))].filter(Boolean);

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg" display="flex" alignItems="center" gap={2}><FiBook /> Diseases</Heading><Text color="gray.500" mt={1}>{items.length} entries</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openNew}>New Disease</Button>
        </HStack>
      </Flex>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '280px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search name, ICD-10..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <InputRightElement><IconButton icon={<FiX />} size="xs" variant="ghost" onClick={() => setSearch('')} aria-label="Clear" /></InputRightElement>}
        </InputGroup>
        <Select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)} maxW="180px">
          <option value="all">All Specialties</option>
          {uniqueSpecialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} maxW="150px">
          <option value="all">All Severity</option>
          <option value="acute">Acute</option><option value="chronic">Chronic</option><option value="both">Both</option>
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? <Box textAlign="center" py={20} color="gray.400">No diseases found</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filtered.map((d) => (
              <Box key={d._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box h="4px" bg={severityColor(d.severity)} />
                <Box p={5}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Badge colorScheme={severityColor(d.severity)}>{d.severity}</Badge>
                    {d.icd10Code && <Badge colorScheme="cyan" fontFamily="monospace">{d.icd10Code}</Badge>}
                  </Flex>
                  <Heading size="sm" mb={1} noOfLines={2}>{d.name}</Heading>
                  <Badge variant="subtle" colorScheme="blue" mb={2}>{d.specialty}</Badge>
                  <Text fontSize="sm" color="gray.500" noOfLines={2} mb={2}>{d.description}</Text>
                  <Wrap spacing={1} mb={2}>
                    {Array.isArray(d.symptoms) ? d.symptoms.slice(0, 4).map((s, i) => <Tag key={i} size="sm" variant="subtle" colorScheme="red">{s}</Tag>) : '—'}
                    {d.symptoms?.length > 4 && <Text fontSize="xs" color="gray.400">+{d.symptoms.length - 4}</Text>}
                  </Wrap>
                  <Text fontSize="xs" color="teal.600" fontWeight="semibold" mb={3} noOfLines={2}>
                    Tx: {d.treatment?.slice(0, 60)}{d.treatment?.length > 60 ? '...' : ''}
                  </Text>
                  <Flex justify="space-between" fontSize="xs" color="gray.400" mb={2}>
                    <span>System: {d.bodySystem || '—'}</span>
                    <span>Tags: {d.tags?.length || 0}</span>
                  </Flex>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEye />} onClick={() => { setSelectedDisease(d); setViewOpen(true); }}>View</Button>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />} onClick={() => openEdit(d)}>Edit</Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(d)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      <DiseaseViewModal 
        isOpen={viewOpen} 
        onClose={() => { setViewOpen(false); setSelectedDisease(null); }} 
        disease={selectedDisease} 
        // aiSummary={aiSummary} 
        // aiLoading={aiLoading} 
        // onGenerateSummary={handleGenerateSummary} 
      />

      <DiseaseEditModal 
        isOpen={isOpen} 
        onClose={onClose} 
        form={form} 
        setForm={setForm} 
        isNew={isNew} 
        saving={saving} 
        onSave={handleSave} 
      />
    </Box>
  );
};

const DiseaseViewModal = ({ isOpen, onClose, disease }) => {
  if (!disease) return null;

  const severityColor = (s) => { switch (s) { case 'acute': return 'red'; case 'chronic': return 'orange'; case 'both': return 'purple'; default: return 'gray'; } };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display="flex" alignItems="center" gap={3}>
          <FiBook /> {disease?.name || 'Disease Details'}
          {disease?.icd10Code && <Badge colorScheme="cyan" fontFamily="monospace">{disease.icd10Code}</Badge>}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Box gridColumn={{ md: 'span 2' }}>
              <Flex gap={3} flexWrap="wrap" mb={4}>
                <Badge colorScheme="blue">{disease?.specialty}</Badge>
                <Badge colorScheme={severityColor(disease?.severity)}>{disease?.severity}</Badge>
                {disease?.bodySystem && <Badge variant="subtle">{disease.bodySystem}</Badge>}
              </Flex>
              <Box mb={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Description</Text>
                <Text whiteSpace="pre-wrap">{disease?.description || 'No description available.'}</Text>
              </Box>
              <Box mb={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Symptoms</Text>
                {disease?.symptoms?.length > 0 ? (
                  <Wrap>{disease.symptoms.map((item, idx) => <Tag key={idx} size="sm" colorScheme="red">{item}</Tag>)}</Wrap>
                ) : <Text color="gray.500">No symptoms listed.</Text>}
              </Box>
              <Box mb={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Treatment</Text>
                <Text whiteSpace="pre-wrap">{disease?.treatment || 'No treatment details.'}</Text>
              </Box>
              <Box mb={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Red Flags</Text>
                {disease?.redFlags?.length > 0 ? disease.redFlags.map((rf, idx) => <Text key={idx} fontSize="sm">• {rf}</Text>) : <Text color="gray.500">None.</Text>}
              </Box>
            </Box>
            <VStack spacing={4} align="stretch">
              <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Diagnostics</Text>
                <Text whiteSpace="pre-wrap">{disease?.diagnosticTests?.join('\n') || 'No diagnostic tests listed.'}</Text>
              </Box>
              <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Differential Diagnosis</Text>
                <Text whiteSpace="pre-wrap">{disease?.differentialDiagnosis?.join('\n') || 'No differential diagnoses available.'}</Text>
              </Box>
              <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Medication Links</Text>
                {disease?.relatedMedicationIds?.length > 0 ? (
                  <Wrap>{disease.relatedMedicationIds.map((med, idx) => <Tag key={idx} size="sm" colorScheme="blue">{med.name || med}</Tag>)}</Wrap>
                ) : <Text color="gray.500">No medication links.</Text>}
              </Box>
              <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                <Text fontWeight="bold" mb={2}>Tags</Text>
                {disease?.tags?.length > 0 ? <Wrap>{disease.tags.map((tag, idx) => <Tag key={idx} size="sm" variant="subtle">{tag}</Tag>)}</Wrap> : <Text color="gray.500">No tags.</Text>}
              </Box>
            </VStack>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const DiseaseEditModal = ({ isOpen, onClose, form, setForm, isNew, saving, onSave }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay /><ModalContent maxW="800px">
        <ModalHeader>{isNew ? 'New Disease' : `Edit: ${form.name}`}</ModalHeader><ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <SimpleGrid columns={3} spacing={4} w="full">
              <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Diabetes Mellitus" /></FormControl>
              <FormControl><FormLabel>ICD-10 Code</FormLabel><Input value={form.icd10Code} onChange={e => setForm({...form, icd10Code: e.target.value})} placeholder="E10-E14" fontFamily="monospace" /></FormControl>
              <FormControl isRequired><FormLabel>Specialty</FormLabel><Input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} placeholder="Endocrinology" /></FormControl>
            </SimpleGrid>
            <SimpleGrid columns={3} spacing={4} w="full">
              <FormControl><FormLabel>Body System</FormLabel><Input value={form.bodySystem} onChange={e => setForm({...form, bodySystem: e.target.value})} placeholder="Endocrine" /></FormControl>
              <FormControl><FormLabel>Severity</FormLabel><Select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option value="acute">Acute</option><option value="chronic">Chronic</option><option value="both">Both</option></Select></FormControl>
              <FormControl><FormLabel>Image URL</FormLabel><Input value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} /></FormControl>
            </SimpleGrid>
            <FormControl isRequired><FormLabel>Description</FormLabel><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></FormControl>
            <Accordion w="full" allowToggle>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Clinical Details</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Epidemiology</FormLabel><Textarea value={form.epidemiology} onChange={e => setForm({...form, epidemiology: e.target.value})} rows={2} /></FormControl>
                    <FormControl><FormLabel>Causes</FormLabel><Textarea value={form.causes} onChange={e => setForm({...form, causes: e.target.value})} rows={2} /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Symptoms (one per line)</FormLabel><Textarea value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} rows={3} /></FormControl>
                    <FormControl><FormLabel>Risk Factors (one per line)</FormLabel><Textarea value={form.riskFactors} onChange={e => setForm({...form, riskFactors: e.target.value})} rows={3} /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Diagnostic Tests (one per line)</FormLabel><Textarea value={form.diagnosticTests} onChange={e => setForm({...form, diagnosticTests: e.target.value})} rows={2} /></FormControl>
                    <FormControl><FormLabel>Differential Dx (one per line)</FormLabel><Textarea value={form.differentialDiagnosis} onChange={e => setForm({...form, differentialDiagnosis: e.target.value})} rows={2} /></FormControl>
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Management</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Treatment</FormLabel><Textarea value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} rows={2} /></FormControl>
                    <FormControl><FormLabel>Prognosis</FormLabel><Textarea value={form.prognosis} onChange={e => setForm({...form, prognosis: e.target.value})} rows={2} /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Prevention</FormLabel><Textarea value={form.prevention} onChange={e => setForm({...form, prevention: e.target.value})} rows={2} /></FormControl>
                    <FormControl><FormLabel>Medications (one per line)</FormLabel><Textarea value={form.medications} onChange={e => setForm({...form, medications: e.target.value})} rows={2} /></FormControl>
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Safety &amp; Metadata</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Red Flags (one per line)</FormLabel><Textarea value={form.redFlags} onChange={e => setForm({...form, redFlags: e.target.value})} rows={3} placeholder="Sudden severe headache\nNeck stiffness\nRash" /></FormControl>
                    <FormControl><FormLabel>Complications</FormLabel><Textarea value={form.complications} onChange={e => setForm({...form, complications: e.target.value})} rows={3} /></FormControl>
                  </SimpleGrid>
                  <FormControl mt={4}><FormLabel>Tags (comma separated)</FormLabel><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="cardiology, arrhythmia, emergency" /></FormControl>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button colorScheme="teal" onClick={onSave} isLoading={saving}>{isNew ? 'Create' : 'Save Changes'}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DiseasesPanel;
