import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, Button, Spinner, Alert, AlertIcon,
  FormControl, FormLabel, Input, Textarea, Select, Switch,
  useColorModeValue, useToast, IconButton, VStack, SimpleGrid,
  Divider, HStack, Card, CardBody, Icon
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiHeart, FiPlus, FiTrash2 } from 'react-icons/fi';
import { getClinicalCaseById, createClinicalCase, updateClinicalCase } from '../services/api';

const ClinicalCaseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [form, setForm] = useState({
    title: '',
    specialty: '',
    difficulty: 'medium',
    patientHistory: '',
    symptoms: [''],
    physicalExam: [''],
    labResults: [''],
    diagnosis: '',
    treatmentPlan: '',
    discussion: '',
    premiumOnly: false,
  });

  useEffect(() => {
    if (isNew) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await getClinicalCaseById(id);
        const c = data.clinicalCase;
        setForm({
          title: c.title || '',
          specialty: c.specialty || '',
          difficulty: c.difficulty || 'medium',
          patientHistory: c.patientHistory || '',
          symptoms: c.symptoms?.length ? c.symptoms : [''],
          physicalExam: c.physicalExam?.length ? c.physicalExam : [''],
          labResults: c.labResults?.length ? c.labResults : [''],
          diagnosis: c.diagnosis || '',
          treatmentPlan: c.treatmentPlan || '',
          discussion: c.discussion || '',
          premiumOnly: c.premiumOnly || false,
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load clinical case');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!form.title || !form.specialty || !form.patientHistory || !form.diagnosis) {
      toast({ title: 'Title, specialty, patient history, and diagnosis are required', status: 'warning', duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        symptoms: form.symptoms.filter((s) => s.trim()),
        physicalExam: form.physicalExam.filter((s) => s.trim()),
        labResults: form.labResults.filter((s) => s.trim()),
      };
      if (isNew) {
        await createClinicalCase(payload);
        toast({ title: 'Clinical case created', status: 'success', duration: 3000 });
      } else {
        await updateClinicalCase(id, payload);
        toast({ title: 'Clinical case updated', status: 'success', duration: 3000 });
      }
      navigate('/admin/clinical-cases');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed', status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (field) => setForm({ ...form, [field]: [...form[field], ''] });
  const removeItem = (field, index) => {
    const arr = form[field].filter((_, i) => i !== index);
    setForm({ ...form, [field]: arr.length ? arr : [''] });
  };
  const updateItem = (field, index, value) => {
    const arr = [...form[field]];
    arr[index] = value;
    setForm({ ...form, [field]: arr });
  };

  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>;
  if (error) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box maxW="900px">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Flex align="center" gap={3}>
          <IconButton icon={<FiArrowLeft />} variant="ghost"
            onClick={() => navigate('/admin/clinical-cases')} aria-label="Back" />
          <Box>
            <Text fontSize="sm" color="gray.500">
              Clinical Cases / {isNew ? 'New Case' : 'Edit Case'}
            </Text>
            <Heading size="lg">{isNew ? 'New Clinical Case' : 'Edit Clinical Case'}</Heading>
          </Box>
        </Flex>
        <Button colorScheme="teal" leftIcon={<FiSave />} onClick={handleSave} isLoading={saving}>
          {isNew ? 'Create Case' : 'Save Changes'}
        </Button>
      </Flex>

      <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
        <CardBody p={6}>
          <VStack spacing={6} align="stretch">
            {/* Basic Info */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Acute Ischemic Stroke" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Specialty</FormLabel>
                <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="Neurology" />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <FormControl>
                <FormLabel>Difficulty</FormLabel>
                <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </FormControl>
              <FormControl display="flex" alignItems="flex-end" pb={2}>
                <HStack>
                  <Switch isChecked={form.premiumOnly}
                    onChange={(e) => setForm({ ...form, premiumOnly: e.target.checked })} />
                  <FormLabel mb={0}>Premium Only</FormLabel>
                </HStack>
              </FormControl>
            </SimpleGrid>

            <Divider />

            {/* Patient History */}
            <FormControl isRequired>
              <FormLabel>Patient History</FormLabel>
              <Textarea value={form.patientHistory}
                onChange={(e) => setForm({ ...form, patientHistory: e.target.value })}
                rows={3} placeholder="72M with HTN, AFib presents with sudden R-sided weakness..." />
            </FormControl>

            {/* Symptoms list */}
            <FormControl>
              <FormLabel>Symptoms</FormLabel>
              {form.symptoms.map((s, i) => (
                <Flex key={i} gap={2} mb={2}>
                  <Input value={s} onChange={(e) => updateItem('symptoms', i, e.target.value)}
                    placeholder={`Symptom ${i + 1}`} />
                  <IconButton size="sm" variant="ghost" colorScheme="red"
                    icon={<FiTrash2 />} onClick={() => removeItem('symptoms', i)} aria-label="Remove" />
                </Flex>
              ))}
              <Button size="xs" variant="outline" leftIcon={<FiPlus />} onClick={() => addItem('symptoms')}>
                Add Symptom
              </Button>
            </FormControl>

            {/* Physical Exam list */}
            <FormControl>
              <FormLabel>Physical Exam</FormLabel>
              {form.physicalExam.map((item, i) => (
                <Flex key={i} gap={2} mb={2}>
                  <Input value={item} onChange={(e) => updateItem('physicalExam', i, e.target.value)}
                    placeholder={`BP 165/95, HR 92...`} />
                  <IconButton size="sm" variant="ghost" colorScheme="red"
                    icon={<FiTrash2 />} onClick={() => removeItem('physicalExam', i)} aria-label="Remove" />
                </Flex>
              ))}
              <Button size="xs" variant="outline" leftIcon={<FiPlus />} onClick={() => addItem('physicalExam')}>
                Add Finding
              </Button>
            </FormControl>

            {/* Lab Results list */}
            <FormControl>
              <FormLabel>Lab Results</FormLabel>
              {form.labResults.map((item, i) => (
                <Flex key={i} gap={2} mb={2}>
                  <Input value={item} onChange={(e) => updateItem('labResults', i, e.target.value)}
                    placeholder={`Hb: 14.2 g/dL`} />
                  <IconButton size="sm" variant="ghost" colorScheme="red"
                    icon={<FiTrash2 />} onClick={() => removeItem('labResults', i)} aria-label="Remove" />
                </Flex>
              ))}
              <Button size="xs" variant="outline" leftIcon={<FiPlus />} onClick={() => addItem('labResults')}>
                Add Result
              </Button>
            </FormControl>

            <Divider />

            {/* Diagnosis */}
            <FormControl isRequired>
              <FormLabel>Diagnosis</FormLabel>
              <Input value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Acute Ischemic Stroke - Left MCA territory" />
            </FormControl>

            {/* Treatment Plan */}
            <FormControl>
              <FormLabel>Treatment Plan</FormLabel>
              <Textarea value={form.treatmentPlan}
                onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
                rows={3} placeholder="tPA within window, anticoagulation, BP management..." />
            </FormControl>

            {/* Discussion */}
            <FormControl>
              <FormLabel>Discussion</FormLabel>
              <Textarea value={form.discussion}
                onChange={(e) => setForm({ ...form, discussion: e.target.value })}
                rows={3} placeholder="Key learning points, differentials, clinical reasoning..." />
            </FormControl>
          </VStack>
        </CardBody>
      </Card>

      {/* Bottom save bar */}
      <Flex justify="flex-end" mt={6} gap={3}>
        <Button variant="ghost" onClick={() => navigate('/admin/clinical-cases')}>Cancel</Button>
        <Button colorScheme="teal" leftIcon={<FiSave />} onClick={handleSave} isLoading={saving}>
          {isNew ? 'Create Case' : 'Save Changes'}
        </Button>
      </Flex>
    </Box>
  );
};

export default ClinicalCaseEditor;
