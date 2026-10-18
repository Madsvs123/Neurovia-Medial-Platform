import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, IconButton, useColorModeValue, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Switch, Divider, Select, Input, Stat, StatLabel, StatNumber,
  Tag, Wrap, Tabs, TabList, TabPanels, Tab, TabPanel, Accordion, AccordionItem,
  AccordionButton, AccordionPanel, AccordionIcon, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Radio, RadioGroup,
} from '@chakra-ui/react';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiToggleLeft, FiToggleRight,
  FiCpu, FiActivity, FiBarChart2, FiGrid,
} from 'react-icons/fi';
import {
  getDoctorTools, createDoctorTool, updateDoctorTool, toggleDoctorTool,
  deleteDoctorTool, getDoctorToolAlgorithms, calculateDoctorTool,
} from '../services/api';

const DoctorTools = () => {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [form, setForm] = useState({
    name: '', category: '', subcategory: 'risk', specialty: '', description: '',
    algorithmId: '', aiEnabled: false, premiumOnly: false, enabled: true,
  });

  // Algorithm calculation state
  const [algorithms, setAlgorithms] = useState(null);
  const [calcTool, setCalcTool] = useState(null);
  const [calcInputs, setCalcInputs] = useState({});
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const { isOpen: calcOpen, onOpen: onCalcOpen, onClose: onCalcClose } = useDisclosure();

  useEffect(() => { fetchTools(); fetchAlgorithms(); }, []);

  const fetchTools = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getDoctorTools({ limit: 100 });
      setTools(data.doctorTools || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const fetchAlgorithms = async () => {
    try {
      const { data } = await getDoctorToolAlgorithms();
      setAlgorithms(data.algorithms);
    } catch { /* admin page can work without it */ }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category: '', subcategory: 'risk', specialty: '', description: '', algorithmId: '', aiEnabled: false, premiumOnly: false, enabled: true });
    onOpen();
  };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name || '', category: t.category || '', subcategory: t.subcategory || 'risk',
      specialty: t.specialty || '', description: t.description || '',
      algorithmId: t.algorithmId || '', aiEnabled: t.aiEnabled || false,
      premiumOnly: t.premiumOnly || false, enabled: t.enabled ?? true,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.description) {
      toast({ title: 'Name, category, and description required', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      if (editing) { await updateDoctorTool(editing._id, form); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      else { await createDoctorTool(form); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      onClose(); fetchTools();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };
  const handleToggle = async (t) => {
    try { await toggleDoctorTool(t._id); fetchTools(); toast({ title: `${t.enabled ? 'Disabled' : 'Enabled'}`, status: 'success', duration: 2000 }); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };
  const handleDelete = async (t) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try { await deleteDoctorTool(t._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchTools(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  // ── Algorithm Calculator ──────────────────────

  const openCalculator = (tool) => {
    setCalcTool(tool);
    setCalcInputs({});
    setCalcResult(null);
    onCalcOpen();
  };

  const buildAlgorithmInput = (algoId) => {
    if (!algorithms) return [];
    const all = [...algorithms.riskScores, ...algorithms.formulas, ...algorithms.converters];
    return all.find(a => a.id === algoId);
  };

  const handleCalcInput = (key, value) => setCalcInputs(prev => ({ ...prev, [key]: value }));

  const runCalculate = async () => {
    if (!calcTool?.algorithmId) {
      toast({ title: 'No algorithm configured for this tool', status: 'warning', duration: 3000 }); return;
    }
    try { setCalcLoading(true);
      const { data } = await calculateDoctorTool(calcTool.algorithmId, calcInputs);
      setCalcResult(data.result);
    } catch (err) { toast({ title: 'Calculation error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setCalcLoading(false); }
  };

  const subcatColor = { risk: 'red', formula: 'blue', converter: 'green', decision: 'orange', algorithm: 'purple' };

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}><FiCpu /> Doctor Tools</Heading>
          <Text color="gray.500" mt={1}>
            {tools.length} tools • {algorithms ? Object.values(algorithms).flat().length : '…'} algorithms available
          </Text>
        </Box>
        <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openCreate}>New Tool</Button>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : <Tabs variant="soft-rounded" colorScheme="blue" isLazy>
            <TabList mb={5} flexWrap="wrap">
              <Tab><FiBarChart2 size="14" style={{ marginRight: 6 }} />Risk Scores</Tab>
              <Tab><FiGrid size="14" style={{ marginRight: 6 }} />Formulas</Tab>
              <Tab><FiActivity size="14" style={{ marginRight: 6 }} />Converters</Tab>
              <Tab>All ({tools.length})</Tab>
            </TabList>
            <TabPanels>
              {['risk', 'formula', 'converter'].map(cat => (
                <TabPanel key={cat} px={0}>
                  <Box display={tools.filter(t => t.subcategory === cat).length === 0 ? 'block' : 'none'} textAlign="center" py={10} color="gray.400">
                    No {cat} tools configured
                  </Box>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
                    {tools.filter(t => t.subcategory === cat || (!t.subcategory && t.subcategory !== 'all')).map(t => renderToolCard(t))}
                  </SimpleGrid>
                </TabPanel>
              ))}
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
                  {tools.map(t => renderToolCard(t))}
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>}

      {/* Calculator Modal */}
      <Modal isOpen={calcOpen} onClose={onCalcClose} size="lg" scrollBehavior="inside">
        <ModalOverlay /><ModalContent>
          <ModalHeader>
            <Flex align="center" gap={2}>
              <FiGrid /> {calcTool?.name || 'Calculate'}
              {calcTool?.algorithmId && <Badge colorScheme="purple">{calcTool.algorithmId}</Badge>}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {calcTool?.algorithmId ? (
              <VStack spacing={4} align="stretch">
                <CalculatorForm
                  algoId={calcTool.algorithmId}
                  inputs={calcInputs}
                  onChange={handleCalcInput}
                  meta={buildAlgorithmInput(calcTool.algorithmId)}
                />
                {calcResult && (
                  <Box bg={useColorModeValue('green.50', 'green.900')} p={4} borderRadius="lg" borderWidth="1px" borderColor="green.300">
                    <Text fontWeight="bold" fontSize="sm" mb={2}>Result</Text>
                    <pre style={{ fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', color: 'var(--chakra-colors-gray-700)' }}>
                      {JSON.stringify(calcResult, null, 2)}
                    </pre>
                  </Box>
                )}
              </VStack>
            ) : (
              <Text color="gray.400">No algorithm linked to this tool. Edit to assign an algorithm ID.</Text>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onCalcClose}>Close</Button>
            <Button colorScheme="teal" leftIcon={<FiCpu />} onClick={runCalculate} isLoading={calcLoading}>
              Calculate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Tool Edit/Create Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay /><ModalContent>
          <ModalHeader>{editing ? 'Edit' : 'New'} Doctor Tool</ModalHeader><ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="NIH Stroke Scale" /></FormControl>
                <FormControl isRequired><FormLabel>Category</FormLabel><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Neurology" /></FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>Subcategory</FormLabel>
                  <Select value={form.subcategory} onChange={e => setForm({...form, subcategory: e.target.value})}>
                    <option value="risk">Risk Score</option><option value="formula">Formula</option>
                    <option value="converter">Converter</option><option value="decision">Decision Rule</option><option value="algorithm">Algorithm</option>
                  </Select>
                </FormControl>
                <FormControl><FormLabel>Specialty</FormLabel><Input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} placeholder="Neurology" /></FormControl>
              </SimpleGrid>
              <FormControl><FormLabel>Algorithm ID (for calculation)</FormLabel>
                <Select value={form.algorithmId} onChange={e => setForm({...form, algorithmId: e.target.value})}>
                  <option value="">— None —</option>
                  {algorithms && Object.entries(algorithms).map(([group, list]) =>
                    <optgroup key={group} label={group}>
                      {list.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </optgroup>
                  )}
                </Select>
              </FormControl>
              <FormControl isRequired><FormLabel>Description</FormLabel><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></FormControl>
              <SimpleGrid columns={3} spacing={4} w="full">
                <FormControl display="flex" alignItems="center" gap={2}>
                  <Switch isChecked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} />
                  <FormLabel mb={0} fontSize="sm">Enabled</FormLabel>
                </FormControl>
                <FormControl display="flex" alignItems="center" gap={2}>
                  <Switch isChecked={form.aiEnabled} onChange={e => setForm({...form, aiEnabled: e.target.checked})} />
                  <FormLabel mb={0} fontSize="sm">AI-Powered</FormLabel>
                </FormControl>
                <FormControl display="flex" alignItems="center" gap={2}>
                  <Switch isChecked={form.premiumOnly} onChange={e => setForm({...form, premiumOnly: e.target.checked})} />
                  <FormLabel mb={0} fontSize="sm">Premium</FormLabel>
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSave} isLoading={saving}>{editing ? 'Update' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );

  // ── Tool Card Renderer ────────────────────
  function renderToolCard(t) {
    return (
      <Box key={t._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
        shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s"
        display="flex" flexDirection="column">
        <Box h="5px" bgGradient={t.enabled ? 'linear(to-r, blue.300, blue.500)' : 'linear(to-r, gray.300, gray.400)'} />
        <Box p={5} display="flex" flexDirection="column" flex={1}>
          <Flex justify="space-between" align="start" mb={2}>
            <Box>
              <Heading size="sm">{t.name}</Heading>
              <Badge colorScheme={subcatColor[t.subcategory] || 'gray'} fontSize="xs" mt={1}>{t.subcategory || t.category}</Badge>
            </Box>
            <Badge colorScheme={t.enabled ? 'green' : 'gray'}>{t.enabled ? 'Active' : 'Inactive'}</Badge>
          </Flex>
          {t.specialty && <Badge variant="subtle" colorScheme="blue" fontSize="xs" mb={2} alignSelf="flex-start">{t.specialty}</Badge>}
          <Text fontSize="sm" color="gray.500" noOfLines={2} mb={3} flex={1}>{t.description}</Text>
          <Flex gap={2} mb={3} fontSize="xs">
            {t.aiEnabled && <Badge colorScheme="purple" variant="subtle">AI-Powered</Badge>}
            {t.premiumOnly && <Badge colorScheme="yellow" variant="subtle">Premium</Badge>}
            {t.algorithmId && <Badge colorScheme="cyan" variant="subtle">calc: {t.algorithmId}</Badge>}
          </Flex>
          <Divider mb={3} />
          <Flex gap={2}>
            {t.algorithmId && (
              <Button size="sm" colorScheme="teal" variant="solid" leftIcon={<FiCpu />}
                onClick={() => openCalculator(t)}>
                Calculate
              </Button>
            )}
            <Button size="sm" variant="outline" leftIcon={<FiEdit2 />} onClick={() => openEdit(t)}>Edit</Button>
            <Button size="sm" variant="outline"
              leftIcon={t.enabled ? <FiToggleLeft /> : <FiToggleRight />}
              colorScheme={t.enabled ? 'orange' : 'green'} onClick={() => handleToggle(t)}>
              {t.enabled ? 'Disable' : 'Enable'}
            </Button>
            <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(t)} aria-label="Delete" />
          </Flex>
        </Box>
      </Box>
    );
  }
};

// ── Algorithm Input Form ────────────────────
const CalculatorForm = ({ algoId, inputs, onChange, meta }) => {
  const renderInput = (key, label) => {
    const keyPrefix = algoId === 'bmi' ? '' : '';
    const isNumber = ['age', 'weightKg', 'heightCm', 'creatinine', 'na', 'cl', 'hco3',
      'rr', 'sbp', 'bun', 'bilirubin', 'inr', 'age', 'apacheScore', 'chronicHealthPoints',
    ].includes(key) || typeof inputs[key] !== 'string';

    if (['confusion', 'chf', 'hypertension', 'strokeTia', 'vascularDisease', 'diabetes',
      'age65', 'renal', 'liver', 'stroke', 'bleeding', 'labileInr', 'elderly', 'drugs', 'alcohol',
      'activeCancer', 'paralysisPlegia', 'recentSurgery', 'calfSwelling', 'collateralVeins',
      'pittingEdema', 'entireLegSwollen', 'pain', 'alternativeDxMoreLikely', 'dvtSymptoms',
      'peMostLikely', 'immobilization', 'hemoptysis', 'cancer', 'alternativeDxLessLikely',
      'mentalStatus', 'inabilityWeightBear', 'boneTenderness', 'malleolarPain',
      'fever', 'tonsillarExudate', 'tenderLymph', 'noCough', 'age55', 'cadRisk',
      'sten50', 'ecgSt', 'angina2', 'aspirin7d', 'cardiacEnzymes',
      'dialysis',
    ].includes(key)) {
      return (
        <FormControl key={key}>
          <FormLabel fontSize="sm">{label}</FormLabel>
          <Switch isChecked={inputs[key] || false} onChange={e => onChange(key, e.target.checked)} />
        </FormControl>
      );
    }

    if (['sex', 'ageCat', 'eye', 'verbal', 'motor'].includes(key)) {
      return (
        <FormControl key={key}>
          <FormLabel fontSize="sm">{label}</FormLabel>
          <Select value={inputs[key] || ''} onChange={e => onChange(key, e.target.value)}>
            <option value="">Select…</option>
            {key === 'sex' && <><option value="male">Male</option><option value="female">Female</option></>}
            {key === 'ageCat' && <><option value="3-14">3–14</option><option value="15-44">15–44</option><option value="45">45+</option></>}
            {key === 'eye' && <><option value="none">None</option><option value="pain">To pain</option><option value="speech">To speech</option><option value="spontaneous">Spontaneous</option></>}
            {key === 'verbal' && <><option value="none">None</option><option value="sounds">Incomprehensible sounds</option><option value="words">Inappropriate words</option><option value="confused">Confused</option><option value="oriented">Oriented</option></>}
            {key === 'motor' && <><option value="none">None</option><option value="extension">Extension</option><option value="flexion">Flexion</option><option value="withdraw">Withdraws</option><option value="localize">Localizes</option><option value="obeys">Obeys commands</option></>}
          </Select>
        </FormControl>
      );
    }

    return (
      <FormControl key={key}>
        <FormLabel fontSize="sm">{label}</FormLabel>
        <NumberInput value={inputs[key] || ''} onChange={(v) => onChange(key, Number(v))}>
          <NumberInputField placeholder="0" />
          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
        </NumberInput>
      </FormControl>
    );
  };

  const fieldLabels = {
    age: 'Age', sex: 'Sex', weightKg: 'Weight (kg)', heightCm: 'Height (cm)',
    creatinine: 'Creatinine (mg/dL)', na: 'Sodium (Na⁺)', cl: 'Chloride (Cl⁻)', hco3: 'Bicarbonate (HCO₃⁻)',
    rr: 'Respiratory Rate', sbp: 'Systolic BP', bun: 'BUN (mg/dL)',
    bilirubin: 'Bilirubin (mg/dL)', inr: 'INR',
    age65: 'Age ≥ 65', confusion: 'Confusion', respRate: 'Resp Rate ≥ 30', bp: 'BP < 90/60',
    chf: 'CHF', hypertension: 'Hypertension', strokeTia: 'Stroke/TIA/TE', vascularDisease: 'Vascular Disease',
    diabetes: 'Diabetes', renal: 'Renal Disease', liver: 'Liver Disease',
    stroke: 'Prior Stroke', bleeding: 'Bleeding History',
    labileInr: 'Labile INR', elderly: 'Elderly (>65)', drugs: 'Drugs (antiplatelet/NSAID)',
    alcohol: 'Alcohol', activeCancer: 'Active Cancer',
    paralysisPlegia: 'Paralysis/Plegia', recentSurgery: 'Recent Surgery/Immobilization',
    calfSwelling: 'Calf Swelling >3cm', collateralVeins: 'Collateral Superficial Veins',
    pittingEdema: 'Pitting Edema', entireLegSwollen: 'Entire Leg Swollen',
    pain: 'Tenderness along veins', alternativeDxMoreLikely: 'Alternative Dx more likely',
    dvtSymptoms: 'Clinical DVT symptoms', peMostLikely: 'PE most likely Dx',
    hr100: 'HR > 100', immobilization: 'Immobilization >3 days',
    hemoptysis: 'Hemoptysis', cancer: 'Cancer (active)',
    alternativeDxLessLikely: 'Alternative Dx less likely',
    mentalStatus: 'Altered Mental Status',
    age55: 'Age ≥ 55', inabilityWeightBear: 'Cannot bear weight',
    boneTenderness: 'Bone tenderness', malleolarPain: 'Malleolar pain',
    fever: 'Fever >38°C', tonsillarExudate: 'Tonsillar exudate',
    tenderLymph: 'Tender cervical LN', noCough: 'Absent cough',
    cadRisk: '≥3 CAD risk factors', sten50: 'Known stenosis ≥50%',
    ecgSt: 'ST deviation on ECG', angina2: '≥2 anginal events in 24h',
    aspirin7d: 'Aspirin use 7d', cardiacEnzymes: 'Elevated cardiac enzymes',
    dialysis: 'On dialysis', apacheScore: 'Apache II score',
    chronicHealthPoints: 'Chronic health points',
  };

  const gcsInputs = ['eye', 'verbal', 'motor'];
  const centorInputs = ['fever', 'tonsillarExudate', 'tenderLymph', 'noCough', 'ageCat'];

  // Define dynamic inputs based on algorithm
  let inputKeys = [];
  if (algoId === 'cha2ds2vasc') inputKeys = ['age', 'sex', 'chf', 'hypertension', 'strokeTia', 'vascularDisease', 'diabetes'];
  else if (algoId === 'hasBled') inputKeys = ['hypertension', 'renal', 'liver', 'stroke', 'bleeding', 'labileInr', 'elderly', 'drugs', 'alcohol'];
  else if (algoId === 'curb65') inputKeys = ['confusion', 'bun', 'respRate', 'bp', 'age65'];
  else if (algoId === 'gcs') inputKeys = gcsInputs;
  else if (algoId === 'wellsDVT') inputKeys = ['activeCancer', 'paralysisPlegia', 'recentSurgery', 'calfSwelling', 'collateralVeins', 'pittingEdema', 'entireLegSwollen', 'pain', 'alternativeDxMoreLikely'];
  else if (algoId === 'wellsPE') inputKeys = ['dvtSymptoms', 'peMostLikely', 'hr100', 'immobilization', 'hemoptysis', 'cancer', 'alternativeDxLessLikely'];
  else if (algoId === 'timi') inputKeys = ['age65', 'cadRisk', 'sten50', 'ecgSt', 'angina2', 'aspirin7d', 'cardiacEnzymes'];
  else if (algoId === 'qsofa') inputKeys = ['rr', 'sbp', 'mentalStatus'];
  else if (algoId === 'centor') inputKeys = centorInputs;
  else if (algoId === 'ottawaAnkle') inputKeys = ['malleolarPain', 'inabilityWeightBear', 'boneTenderness', 'age55'];
  else if (algoId === 'egfr') inputKeys = ['creatinine', 'age', 'sex'];
  else if (algoId === 'bmi') inputKeys = ['weightKg', 'heightCm'];
  else if (algoId === 'anionGap') inputKeys = ['na', 'cl', 'hco3'];
  else if (algoId === 'meld') inputKeys = ['bilirubin', 'inr', 'creatinine', 'dialysis'];
  else if (algoId === 'creatinineClearance') inputKeys = ['age', 'weightKg', 'creatinine', 'sex'];
  else inputKeys = ['age', 'sex', 'weightKg', 'heightCm'];

  return (
    <SimpleGrid columns={2} spacing={3}>
      {inputKeys.map(k => renderInput(k, fieldLabels[k] || k))}
    </SimpleGrid>
  );
};

export default DoctorTools;
