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
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiEye, FiPackage } from 'react-icons/fi';
import { getMedications, createMedication, updateMedication, deleteMedication } from '../../services/api';
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

const MedicationsPanel = ({ cardBg, borderColor }) => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  // const [aiLoading, setAiLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [form, setForm] = useState({
    name: '', genericName: '', brandNames: '', drugClass: '', mechanismOfAction: '', indications: '',
    dosage: '', dosageForms: '', route: '', halfLife: '', onsetOfAction: '', duration: '',
    contraindications: '', sideEffects: '', seriousSideEffects: '', interactions: '', warnings: '',
    pregnancyCategory: '', pediatricDosage: '', geriatricDosage: '', renalDosage: '', hepaticDosage: '',
    monitoring: '', overdose: '', tags: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true);
      const { data } = await getMedications({ limit: 200 });
      setItems(data.medications || []);
    } catch { /* */ } finally { setLoading(false); }
  };

  const openNew = () => { setIsNew(true); setEditing(null);
    setForm({ name: '', genericName: '', brandNames: '', drugClass: '', mechanismOfAction: '', indications: '',
      dosage: '', dosageForms: '', route: '', halfLife: '', onsetOfAction: '', duration: '',
      contraindications: '', sideEffects: '', seriousSideEffects: '', interactions: '', warnings: '',
      pregnancyCategory: '', pediatricDosage: '', geriatricDosage: '', renalDosage: '', hepaticDosage: '',
      monitoring: '', overdose: '', tags: '' }); onOpen(); };
  const openEdit = (m) => {
    setIsNew(false); setEditing(m);
    setForm({
      name: m.name || '', genericName: m.genericName || '',
      brandNames: Array.isArray(m.brandNames) ? m.brandNames.join(', ') : m.brandNames || '',
      drugClass: m.drugClass || '', mechanismOfAction: m.mechanismOfAction || '', indications: m.indications || '',
      dosage: m.dosage || '', dosageForms: Array.isArray(m.dosageForms) ? m.dosageForms.join(', ') : m.dosageForms || '',
      route: m.route || '', halfLife: m.halfLife || '', onsetOfAction: m.onsetOfAction || '', duration: m.duration || '',
      contraindications: m.contraindications || '',
      sideEffects: Array.isArray(m.sideEffects) ? m.sideEffects.join('\n') : m.sideEffects || '',
      seriousSideEffects: Array.isArray(m.seriousSideEffects) ? m.seriousSideEffects.join('\n') : m.seriousSideEffects || '',
      interactions: Array.isArray(m.interactions) ? m.interactions.join('\n') : m.interactions || '',
      warnings: m.warnings || '',
      pregnancyCategory: m.pregnancyCategory || '', pediatricDosage: m.pediatricDosage || '',
      geriatricDosage: m.geriatricDosage || '', renalDosage: m.renalDosage || '', hepaticDosage: m.hepaticDosage || '',
      monitoring: m.monitoring || '', overdose: m.overdose || '',
      tags: Array.isArray(m.tags) ? m.tags.join(', ') : m.tags || '',
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.drugClass || !form.indications) {
      toast({ title: 'Name, drug class, and indications required', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      const toArray = (v) => v.split('\n').map(s => s.trim()).filter(Boolean);
      const toArrayComma = (v) => v.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        ...form,
        brandNames: toArrayComma(form.brandNames),
        dosageForms: toArrayComma(form.dosageForms),
        sideEffects: toArray(form.sideEffects),
        seriousSideEffects: toArray(form.seriousSideEffects),
        interactions: toArray(form.interactions),
        tags: toArrayComma(form.tags),
      };
      if (isNew) { await createMedication(payload); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      else { await updateMedication(editing._id, payload); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      onClose(); fetchAll();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete "${m.name}" (${m.genericName || 'No generic'})?`)) return;
    try { await deleteMedication(m._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchAll(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  // const handleGenerateSummary = async (text) => {
  //   if (!text) return;
  //   setAiLoading(true);
  //   setAiSummary('');
  //   try {
  //     const response = await aiClient.chat.completions.create({
  //       model: 'gpt-4o-mini',
  //       messages: [{ role: 'user', content: `Summarize this medication reference entry for clinical review:\n\n${text}` }],
  //     });
  //     setAiSummary(normalizeAiOutput(response));
  //   } catch (err) {
  //     toast({ title: 'AI summary failed', description: err.message || 'Unable to generate summary', status: 'error', duration: 3000 });
  //   } finally {
  //     setAiLoading(false);
  //   }
  // };

  const filtered = items.filter((i) => {
    const ms = i.name?.toLowerCase().includes(search.toLowerCase()) || i.genericName?.toLowerCase().includes(search.toLowerCase());
    const mc = classFilter === 'all' || i.drugClass === classFilter;
    return ms && mc;
  });

  const classes = [...new Set(items.map(i => i.drugClass))].filter(Boolean).sort();

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg" display="flex" alignItems="center" gap={2}><FiPackage /> Medications</Heading><Text color="gray.500" mt={1}>{items.length} entries</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openNew}>New Medication</Button>
        </HStack>
      </Flex>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '280px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search name, generic..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} maxW="200px">
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : filtered.length === 0 ? <Box textAlign="center" py={20} color="gray.400">No medications found</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filtered.map((m) => (
              <Box key={m._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box h="4px" bg="purple.400" />
                <Box p={5}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Badge colorScheme="purple">{m.drugClass || 'Unknown'}</Badge>
                    {m.pregnancyCategory && <Badge colorScheme="orange" fontFamily="monospace">{m.pregnancyCategory}</Badge>}
                  </Flex>
                  <Heading size="sm" mb={1} noOfLines={2}>{m.name}</Heading>
                  <Text fontSize="sm" color="gray.500" mb={1}>{m.genericName}</Text>
                  <Wrap spacing={1} mb={2}>
                    {Array.isArray(m.brandNames) ? m.brandNames.slice(0, 3).map((b, i) => <Tag key={i} size="sm" variant="subtle" colorScheme="blue">{b}</Tag>) : '—'}
                    {m.brandNames?.length > 3 && <Text fontSize="xs" color="gray.400">+{m.brandNames.length - 3}</Text>}
                  </Wrap>
                  <Text fontSize="xs" color="teal.600" fontWeight="semibold" mb={3} noOfLines={2}>
                    Indications: {m.indications?.slice(0, 60)}{m.indications?.length > 60 ? '...' : ''}
                  </Text>
                  <Flex justify="space-between" fontSize="xs" color="gray.400" mb={2}>
                    <span>Route: {m.route || '—'}</span>
                    <span>Tags: {m.tags?.length || 0}</span>
                  </Flex>
                  <Divider my={2} />
                  <Flex gap={2}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEye />} onClick={() => { setSelectedMedication(m); setViewOpen(true); }}>View</Button>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />} onClick={() => openEdit(m)}>Edit</Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(m)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      <MedicationViewModal 
        isOpen={viewOpen} 
        onClose={() => { setViewOpen(false); setSelectedMedication(null); }} 
        medication={selectedMedication} 
        // aiSummary={aiSummary} 
        // aiLoading={aiLoading} 
        // onGenerateSummary={handleGenerateSummary} 
      />

      <MedicationEditModal 
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

const MedicationViewModal = ({ isOpen, onClose, medication, aiSummary = '' }) => {
  if (!medication) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display="flex" alignItems="center" gap={3}>
          <FiPackage /> {medication?.name || 'Medication Details'}
          {medication?.pregnancyCategory && <Badge colorScheme="orange" fontFamily="monospace">{medication.pregnancyCategory}</Badge>}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontWeight="bold" mb={2}>Generic Name</Text>
              <Text whiteSpace="pre-wrap">{medication?.genericName || 'None'}</Text>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>Drug Class</Text>
              <Text>{medication?.drugClass || 'Unknown'}</Text>
            </Box>
          </SimpleGrid>
          <Box mt={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
            <Text fontWeight="bold" mb={2}>Indications</Text>
            <Text whiteSpace="pre-wrap">{medication?.indications || 'No indications provided.'}</Text>
          </Box>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>Dosage &amp; Administration</Text>
              <Text whiteSpace="pre-wrap">{medication?.dosage || 'Not specified.'}</Text>
            </Box>
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>Warnings</Text>
              <Text whiteSpace="pre-wrap">{medication?.warnings || 'No warnings listed.'}</Text>
            </Box>
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>Side Effects</Text>
              <Text whiteSpace="pre-wrap">{medication?.sideEffects?.join('\n') || 'None'}</Text>
            </Box>
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>Serious Side Effects</Text>
              <Text whiteSpace="pre-wrap">{medication?.seriousSideEffects?.join('\n') || 'None'}</Text>
            </Box>
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>Interactions</Text>
              <Text whiteSpace="pre-wrap">{medication?.interactions?.join('\n') || 'None'}</Text>
            </Box>
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>Contraindications</Text>
              <Text whiteSpace="pre-wrap">{medication?.contraindications || 'None'}</Text>
            </Box>
          </SimpleGrid>
          {aiSummary ? (
            <Box mt={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <Text fontWeight="bold" mb={2}>AI Summary</Text>
              <Text whiteSpace="pre-wrap">{aiSummary}</Text>
            </Box>
          ) : null}
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const MedicationEditModal = ({ isOpen, onClose, form, setForm, isNew, saving, onSave }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay /><ModalContent maxW="800px">
        <ModalHeader>{isNew ? 'New Medication' : `Edit: ${form.name}`}</ModalHeader><ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <SimpleGrid columns={2} spacing={4} w="full">
              <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Metformin" /></FormControl>
              <FormControl isRequired><FormLabel>Generic Name</FormLabel><Input value={form.genericName} onChange={e => setForm({...form, genericName: e.target.value})} placeholder="metformin hydrochloride" /></FormControl>
            </SimpleGrid>
            <SimpleGrid columns={2} spacing={4} w="full">
              <FormControl><FormLabel>Brand Names (comma separated)</FormLabel><Input value={form.brandNames} onChange={e => setForm({...form, brandNames: e.target.value})} placeholder="Glucophage, Fortamet, Riomet" /></FormControl>
              <FormControl isRequired><FormLabel>Drug Class</FormLabel><Input value={form.drugClass} onChange={e => setForm({...form, drugClass: e.target.value})} placeholder="Biguanide" /></FormControl>
            </SimpleGrid>
            <FormControl isRequired><FormLabel>Indications</FormLabel><Textarea value={form.indications} onChange={e => setForm({...form, indications: e.target.value})} rows={2} placeholder="Type 2 diabetes mellitus" /></FormControl>
            <Accordion w="full" allowToggle>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Pharmacology</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Mechanism of Action</FormLabel><Textarea value={form.mechanismOfAction} onChange={e => setForm({...form, mechanismOfAction: e.target.value})} rows={2} placeholder="Decreases hepatic glucose production" /></FormControl>
                    <FormControl><FormLabel>Route</FormLabel><Input value={form.route} onChange={e => setForm({...form, route: e.target.value})} placeholder="Oral" /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Dosage Forms (comma separated)</FormLabel><Input value={form.dosageForms} onChange={e => setForm({...form, dosageForms: e.target.value})} placeholder="Tablet, Extended-release tablet" /></FormControl>
                    <FormControl><FormLabel>Half-Life</FormLabel><Input value={form.halfLife} onChange={e => setForm({...form, halfLife: e.target.value})} placeholder="6.2 hours" /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Onset of Action</FormLabel><Input value={form.onsetOfAction} onChange={e => setForm({...form, onsetOfAction: e.target.value})} placeholder="1-2 hours" /></FormControl>
                    <FormControl><FormLabel>Duration</FormLabel><Input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="8-12 hours" /></FormControl>
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Dosage &amp; Administration</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <FormControl><FormLabel>Dosage</FormLabel><Textarea value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} rows={3} placeholder="500 mg twice daily" /></FormControl>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Pediatric Dosage</FormLabel><Textarea value={form.pediatricDosage} onChange={e => setForm({...form, pediatricDosage: e.target.value})} rows={2} /></FormControl>
                    <FormControl><FormLabel>Geriatric Dosage</FormLabel><Textarea value={form.geriatricDosage} onChange={e => setForm({...form, geriatricDosage: e.target.value})} rows={2} /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Renal Dosage</FormLabel><Textarea value={form.renalDosage} onChange={e => setForm({...form, renalDosage: e.target.value})} rows={2} /></FormControl>
                    <FormControl><FormLabel>Hepatic Dosage</FormLabel><Textarea value={form.hepaticDosage} onChange={e => setForm({...form, hepaticDosage: e.target.value})} rows={2} /></FormControl>
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Safety &amp; Warnings</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Contraindications</FormLabel><Textarea value={form.contraindications} onChange={e => setForm({...form, contraindications: e.target.value})} rows={2} placeholder="Renal impairment" /></FormControl>
                    <FormControl><FormLabel>Pregnancy Category</FormLabel><Input value={form.pregnancyCategory} onChange={e => setForm({...form, pregnancyCategory: e.target.value})} placeholder="B" /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Side Effects (one per line)</FormLabel><Textarea value={form.sideEffects} onChange={e => setForm({...form, sideEffects: e.target.value})} rows={3} placeholder="Nausea\nDiarrhea\nAbdominal pain" /></FormControl>
                    <FormControl><FormLabel>Serious Side Effects (one per line)</FormLabel><Textarea value={form.seriousSideEffects} onChange={e => setForm({...form, seriousSideEffects: e.target.value})} rows={3} placeholder="Lactic acidosis\nVitamin B12 deficiency" /></FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={2} spacing={4} w="full" mt={4}>
                    <FormControl><FormLabel>Interactions (one per line)</FormLabel><Textarea value={form.interactions} onChange={e => setForm({...form, interactions: e.target.value})} rows={2} placeholder="Cimetidine\nAlcohol" /></FormControl>
                    <FormControl><FormLabel>Warnings</FormLabel><Textarea value={form.warnings} onChange={e => setForm({...form, warnings: e.target.value})} rows={2} placeholder="Risk of lactic acidosis" /></FormControl>
                  </SimpleGrid>
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem><AccordionButton><Box flex={1} textAlign="left" fontWeight="medium">Monitoring &amp; Overdose</Box><AccordionIcon /></AccordionButton>
                <AccordionPanel pb={4}>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <FormControl><FormLabel>Monitoring</FormLabel><Textarea value={form.monitoring} onChange={e => setForm({...form, monitoring: e.target.value})} rows={2} placeholder="Renal function, vitamin B12 levels" /></FormControl>
                    <FormControl><FormLabel>Overdose</FormLabel><Textarea value={form.overdose} onChange={e => setForm({...form, overdose: e.target.value})} rows={2} placeholder="Hemodialysis may be required" /></FormControl>
                  </SimpleGrid>
                  <FormControl mt={4}><FormLabel>Tags (comma separated)</FormLabel><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="diabetes, hypoglycemia, oral" /></FormControl>
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

export default MedicationsPanel;
