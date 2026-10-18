import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Input, InputGroup, InputLeftElement, Select,
  IconButton, useColorModeValue, useToast, Tooltip, HStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Divider, Tag, Wrap, Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiEye, FiAlertTriangle } from 'react-icons/fi';
import { getSymptoms, createSymptom, updateSymptom, deleteSymptom } from '../../services/api';
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

const DetailSection = ({ title, content }) => (
  <Box mb={2}>
    <Text fontSize="xs" fontWeight="bold" color="gray.500">{title}</Text>
    <Text fontSize="sm">{content}</Text>
  </Box>
);

const SymptomsPanel = ({ cardBg, borderColor }) => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  // const [aiSummary, setAiSummary] = useState('');
  // const [aiLoading, setAiLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [form, setForm] = useState({
    name: '', description: '', severity: 'variable', duration: '', specialty: '', bodySystem: '',
    associatedSigns: '', redFlags: '', relatedDiseases: '', relatedDiseaseIds: '', differentialDiagnosis: '', relatedSymptoms: '', tags: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true);
      const { data } = await getSymptoms({ limit: 200 });
      setItems(data.symptoms || []);
    } catch { /* */ } finally { setLoading(false); }
  };

  const openNew = () => { setIsNew(true); setEditing(null);
    setForm({ name: '', description: '', severity: 'variable', duration: '', specialty: '', bodySystem: '', associatedSigns: '', redFlags: '', relatedDiseases: '', relatedDiseaseIds: '', differentialDiagnosis: '', relatedSymptoms: '', tags: '' }); onOpen(); };
  const openEdit = (s) => {
    setIsNew(false); setEditing(s);
    setForm({
      name: s.name || '', description: s.description || '', severity: s.severity || 'variable', duration: s.duration || '',
      specialty: s.specialty || '', bodySystem: s.bodySystem || '',
      associatedSigns: Array.isArray(s.associatedSigns) ? s.associatedSigns.join('\n') : s.associatedSigns || '',
      redFlags: Array.isArray(s.redFlags) ? s.redFlags.join('\n') : s.redFlags || '',
      relatedDiseases: Array.isArray(s.relatedDiseases) ? s.relatedDiseases.join('\n') : s.relatedDiseases || '',
      relatedDiseaseIds: Array.isArray(s.relatedDiseaseIds) ? s.relatedDiseaseIds.map(d => d._id).join(',') : '',
      differentialDiagnosis: Array.isArray(s.differentialDiagnosis) ? s.differentialDiagnosis.join('\n') : s.differentialDiagnosis || '',
      relatedSymptoms: Array.isArray(s.relatedSymptoms) ? s.relatedSymptoms.join('\n') : s.relatedSymptoms || '',
      tags: Array.isArray(s.tags) ? s.tags.join(', ') : s.tags || '',
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: 'Name required', status: 'warning', duration: 3000 }); return; }
    try { setSaving(true);
      const toArray = (v) => v.split('\n').map(s => s.trim()).filter(Boolean);
      const toArrayComma = (v) => v.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        ...form,
        associatedSigns: toArray(form.associatedSigns),
        redFlags: toArray(form.redFlags),
        relatedDiseases: toArray(form.relatedDiseases),
        relatedDiseaseIds: toArrayComma(form.relatedDiseaseIds),
        differentialDiagnosis: toArray(form.differentialDiagnosis),
        relatedSymptoms: toArray(form.relatedSymptoms),
        tags: toArrayComma(form.tags),
      };
      if (isNew) { await createSymptom(payload); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      else { await updateSymptom(editing._id, payload); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      onClose(); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    try { await deleteSymptom(s._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  // const handleGenerateSummary = async (text) => {
  //   if (!text) return;
  //   setAiLoading(true);
  //   setAiSummary('');
  //   try {
  //     const response = await aiClient.chat.completions.create({
  //       model: 'gpt-4o-mini',
  //       messages: [{ role: 'user', content: `Summarize this symptom entry for clinical review:\n\n${text}` }],
  //     });
  //     setAiSummary(normalizeAiOutput(response));
  //   } catch (err) {
  //     toast({ title: 'AI summary failed', description: err.message || 'Unable to generate summary', status: 'error', duration: 3000 });
  //   } finally {
  //     setAiLoading(false);
  //   }
  // };

  const filtered = items.filter((i) => 
    i.name?.toLowerCase().includes(search.toLowerCase()) || 
    i.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const severityColor = (s) => { switch (s) { case 'mild': return 'green'; case 'moderate': return 'orange'; case 'severe': return 'red'; case 'variable': return 'purple'; default: return 'gray'; } };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg" display="flex" alignItems="center" gap={2}><FiAlertTriangle /> Symptoms</Heading><Text color="gray.500" mt={1}>{items.length} entries</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openNew}>New Symptom</Button>
        </HStack>
      </Flex>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '280px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search symptoms..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Text fontSize="sm" color="gray.500">{filtered.length} of {items.length}</Text>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? <Box textAlign="center" py={20} color="gray.400">No symptoms found</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filtered.map((s) => (
              <Box key={s._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box h="4px" bg={severityColor(s.severity)} />
                <Box p={5}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Badge colorScheme={severityColor(s.severity)}>{s.severity}</Badge>
                    {s.bodySystem && <Badge variant="subtle">{s.bodySystem}</Badge>}
                  </Flex>
                  <Heading size="sm" mb={1} noOfLines={2}>{s.name}</Heading>
                  <Text fontSize="sm" color="gray.500" mb={2} noOfLines={2}>{s.description}</Text>
                  <Wrap spacing={1} mb={2}>
                    {Array.isArray(s.associatedSigns) ? s.associatedSigns.slice(0, 3).map((sign, i) => <Tag key={i} size="sm" variant="subtle" colorScheme="red">{sign}</Tag>) : '—'}
                    {s.associatedSigns?.length > 3 && <Text fontSize="xs" color="gray.400">+{s.associatedSigns.length - 3}</Text>}
                  </Wrap>
                  <Text fontSize="xs" color="teal.600" fontWeight="semibold" mb={3} noOfLines={2}>
                    Related: {s.relatedDiseases?.slice(0, 40)}{s.relatedDiseases?.length > 40 ? '...' : ''}
                  </Text>
                  <Flex justify="space-between" fontSize="xs" color="gray.400" mb={2}>
                    <span>Specialty: {s.specialty || '—'}</span>
                    <span>Tags: {s.tags?.length || 0}</span>
                  </Flex>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEye />} onClick={() => { setSelectedSymptom(s); setViewOpen(true); }}>View</Button>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />} onClick={() => openEdit(s)}>Edit</Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(s)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      <SymptomViewModal 
        isOpen={viewOpen} 
        onClose={() => { setViewOpen(false); setSelectedSymptom(null); }} 
        symptom={selectedSymptom} 
        // aiSummary={aiSummary} 
        // aiLoading={aiLoading} 
        // onGenerateSummary={handleGenerateSummary} 
      />

      <SymptomEditModal 
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

const SymptomViewModal = ({ isOpen, onClose, symptom }) => {
  if (!symptom) return null;

  const severityColor = (s) => { switch (s) { case 'mild': return 'green'; case 'moderate': return 'orange'; case 'severe': return 'red'; case 'variable': return 'purple'; default: return 'gray'; } };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader display="flex" alignItems="center" gap={3}>
          <FiAlertTriangle /> {symptom?.name || 'Symptom details'}
          <Badge colorScheme={severityColor(symptom.severity)}>{symptom?.severity || 'Variable'}</Badge>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {symptom ? (
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Badge variant="subtle">{symptom.specialty || 'N/A'}</Badge>
                <Badge variant="subtle">{symptom.bodySystem || 'N/A'}</Badge>
              </HStack>
              <DetailSection title="Description" content={symptom.description || 'No description provided.'} />
              <DetailSection title="Duration" content={symptom.duration || 'N/A'} />
              <DetailSection title="Associated Signs" content={(symptom.associatedSigns || []).join(', ') || 'None'} />
              <DetailSection title="Red Flags" content={(symptom.redFlags || []).join(', ') || 'None'} />
              <DetailSection title="Related Diseases" content={(symptom.relatedDiseases || []).join(', ') || 'None'} />
              <DetailSection title="Differential Diagnosis" content={(symptom.differentialDiagnosis || []).join(', ') || 'None'} />
              <DetailSection title="Related Symptoms" content={(symptom.relatedSymptoms || []).join(', ') || 'None'} />
              <DetailSection title="Tags" content={(symptom.tags || []).join(', ') || 'None'} />

            </VStack>
          ) : (
            <Text>No symptom selected.</Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const SymptomEditModal = ({ isOpen, onClose, form, setForm, isNew, saving, onSave }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay /><ModalContent maxW="800px">
        <ModalHeader>{isNew ? 'New Symptom' : `Edit: ${form.name}`}</ModalHeader><ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <SimpleGrid columns={2} spacing={4} w="full">
              <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Chest pain" /></FormControl>
              <FormControl><FormLabel>Specialty</FormLabel><Input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} placeholder="Cardiology" /></FormControl>
            </SimpleGrid>
            <SimpleGrid columns={2} spacing={4} w="full">
              <FormControl><FormLabel>Body System</FormLabel><Input value={form.bodySystem} onChange={e => setForm({...form, bodySystem: e.target.value})} placeholder="Cardiovascular" /></FormControl>
              <FormControl><FormLabel>Severity</FormLabel><Select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="variable">Variable</option></Select></FormControl>
            </SimpleGrid>
            <FormControl><FormLabel>Description</FormLabel><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Discomfort or pain in the chest" /></FormControl>
            <FormControl><FormLabel>Duration</FormLabel><Input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="Minutes to hours" /></FormControl>
            <Accordion w="full" allowToggle>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Clinical Details</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Associated Signs (one per line)</FormLabel><Textarea value={form.associatedSigns} onChange={e => setForm({...form, associatedSigns: e.target.value})} rows={3} placeholder="Dyspnea\nDiaphoresis\nNausea" /></FormControl>
                    <FormControl><FormLabel>Red Flags (one per line)</FormLabel><Textarea value={form.redFlags} onChange={e => setForm({...form, redFlags: e.target.value})} rows={3} placeholder="Radiation to jaw/arm\nSyncope\nHypotension" /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Related Diseases (one per line)</FormLabel><Textarea value={form.relatedDiseases} onChange={e => setForm({...form, relatedDiseases: e.target.value})} rows={3} placeholder="Myocardial infarction\nAngina pectoris\nGERD" /></FormControl>
                    <FormControl><FormLabel>Differential Diagnosis (one per line)</FormLabel><Textarea value={form.differentialDiagnosis} onChange={e => setForm({...form, differentialDiagnosis: e.target.value})} rows={3} placeholder="ACS\nPulmonary embolism\nPericarditis" /></FormControl>
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Metadata</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Related Symptoms (one per line)</FormLabel><Textarea value={form.relatedSymptoms} onChange={e => setForm({...form, relatedSymptoms: e.target.value})} rows={3} placeholder="Shortness of breath\nPalpitations" /></FormControl>
                    <FormControl><FormLabel>Tags (comma separated)</FormLabel><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="cardiology, emergency, pain" /></FormControl>
                  </SimpleGrid>
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

export default SymptomsPanel;
