import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Badge, Spinner, Alert, AlertIcon,
  Button, IconButton, Input, Select, useColorModeValue, useToast, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, VStack, FormControl, FormLabel,
  Textarea, Switch, Divider,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiRefreshCw } from 'react-icons/fi';
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, toggleSubscriptionPlan, deleteSubscriptionPlan } from '../../services/api';

const PlansTab = ({ cardBg, borderColor, toast }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgMode = useColorModeValue('gray.100', 'gray.700');

  const [form, setForm] = useState({
    name: '', description: '', price: '', currency: 'USD', billingCycle: 'monthly',
    aiLimits: '100', quizAccess: true, clinicalCaseAccess: true, doctorToolsAccess: false,
    features: '', active: true,
  });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getSubscriptionPlans({ limit: 50 });
      setPlans(data.subscriptionPlans || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', currency: 'USD', billingCycle: 'monthly', aiLimits: '100', quizAccess: true, clinicalCaseAccess: true, doctorToolsAccess: false, features: '', active: true });
    onOpen();
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '', description: p.description || '', price: p.price?.toString() || '',
      currency: p.currency || 'USD', billingCycle: p.billingCycle || 'monthly',
      aiLimits: p.aiLimits?.toString() || '100', quizAccess: p.quizAccess ?? true,
      clinicalCaseAccess: p.clinicalCaseAccess ?? true, doctorToolsAccess: p.doctorToolsAccess ?? false,
      features: p.features?.join('\n') || '', active: p.active ?? true,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price || !form.billingCycle) {
      toast({ title: 'Fill required fields', status: 'warning', duration: 3000 }); return;
    }
    try { setSaving(true);
      const payload = { ...form, price: parseFloat(form.price), aiLimits: parseInt(form.aiLimits) || 100, features: form.features.split('\n').map(f => f.trim()).filter(Boolean) };
      if (editing) { await updateSubscriptionPlan(editing._id, payload); toast({ title: 'Updated', status: 'success', duration: 3000 }); }
      else { await createSubscriptionPlan(payload); toast({ title: 'Created', status: 'success', duration: 3000 }); }
      onClose(); fetchPlans();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (p) => {
    try { await toggleSubscriptionPlan(p._id); fetchPlans(); toast({ title: `${p.active ? 'Deactivated' : 'Activated'}`, status: 'success', duration: 2000 }); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try { await deleteSubscriptionPlan(p._id); toast({ title: 'Deleted', status: 'success', duration: 3000 }); fetchPlans(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" mb={4}>
        <Text color="gray.500">{plans.length} plans</Text>
        <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={openCreate}>New Plan</Button>
      </Flex>

      {loading ? <Flex justify="center" py={10}><Spinner /></Flex>
        : plans.length === 0 ? <Box textAlign="center" py={10} color="gray.400">No plans</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5}>
            {plans.map((p) => (
              <Box key={p._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s"
                display="flex" flexDirection="column">
                <Box h="5px" bgGradient={p.active ? 'linear(to-r, teal.300, teal.500)' : 'linear(to-r, gray.300, gray.400)'} />
                <Box p={5} display="flex" flexDirection="column" flex={1}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Box>
                      <Heading size="md">{p.name}</Heading>
                      <Flex gap={2} mt={1}>
                        <Badge colorScheme={p.active ? 'green' : 'gray'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                        <Badge colorScheme={p.billingCycle === 'yearly' ? 'blue' : 'cyan'}>{p.billingCycle}</Badge>
                      </Flex>
                    </Box>
                    <Text fontSize="2xl" fontWeight="bold" color="teal.500" whiteSpace="nowrap">
                      ${p.price}<Text as="span" fontSize="sm" color="gray.400">/{p.billingCycle === 'yearly' ? 'yr' : 'mo'}</Text>
                    </Text>
                  </Flex>
                  <Text fontSize="sm" color="gray.500" noOfLines={2} mb={3}>{p.description}</Text>
                  <Box mb={3} fontSize="xs" flex={1}>
                    {p.features?.slice(0, 5).map((f, i) => (
                      <Flex key={i} align="center" gap={2} mb={1} color="gray.600">
                        <Box w={1.5} h={1.5} bg="teal.400" borderRadius="full" flexShrink={0} />{f}
                      </Flex>
                    ))}
                    {p.features?.length > 5 && <Text color="gray.400">+{p.features.length - 5} more</Text>}
                  </Box>
                  <SimpleGrid columns={2} spacing={2} mb={3} fontSize="xs" flexShrink={0}>
                    <Box bg={bgMode} p={2} borderRadius="md" textAlign="center">
                      <Text fontWeight="bold">{p.aiLimits === 999999 ? '∞' : p.aiLimits}</Text>
                      <Text color="gray.500">AI convos</Text>
                    </Box>
                    <Box bg={bgMode} p={2} borderRadius="md" textAlign="center">
                      <Text fontWeight="bold">{['Quiz','Case','Tool'].filter((_, i) => [p.quizAccess,p.clinicalCaseAccess,p.doctorToolsAccess][i]).length}/3</Text>
                      <Text color="gray.500">Features</Text>
                    </Box>
                  </SimpleGrid>
                  <Flex gap={2} flexShrink={0}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />} onClick={() => openEdit(p)}>Edit</Button>
                    <Button size="sm" variant="outline"
                      leftIcon={p.active ? <FiToggleLeft /> : <FiToggleRight />}
                      colorScheme={p.active ? 'orange' : 'green'} onClick={() => handleToggle(p)}>
                      {p.active ? 'Off' : 'On'}
                    </Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(p)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay /><ModalContent>
          <ModalHeader>{editing ? 'Edit' : 'New'} Plan</ModalHeader><ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Pro Monthly" /></FormControl>
                <FormControl isRequired><FormLabel>Price ($)</FormLabel><Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} /></FormControl>
              </SimpleGrid>
              <FormControl isRequired><FormLabel>Description</FormLabel><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Billing</FormLabel><Select value={form.billingCycle} onChange={e => setForm({...form, billingCycle: e.target.value})}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></FormControl>
                <FormControl><FormLabel>Currency</FormLabel><Select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}><option value="USD">USD</option><option value="EUR">EUR</option></Select></FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>AI Limit</FormLabel><Input type="number" value={form.aiLimits} onChange={e => setForm({...form, aiLimits: e.target.value})} /></FormControl>
                <FormControl display="flex" alignItems="flex-end" pb={2}>
                  <Flex gap={3}><FormLabel mb={0}>Active</FormLabel><Switch isChecked={form.active} onChange={e => setForm({...form, active: e.target.checked})} /></Flex>
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={3} spacing={4} w="full">
                {['quizAccess','clinicalCaseAccess','doctorToolsAccess'].map((k, i) => (
                  <FormControl key={k} display="flex" alignItems="center" gap={2}>
                    <Switch isChecked={form[k]} onChange={e => setForm({...form, [k]: e.target.checked})} />
                    <FormLabel mb={0} fontSize="sm">{['Quiz','Cases','Tools'][i]}</FormLabel>
                  </FormControl>
                ))}
              </SimpleGrid>
              <FormControl><FormLabel>Features (one per line)</FormLabel><Textarea value={form.features} onChange={e => setForm({...form, features: e.target.value})} rows={4} placeholder="Unlimited AI conversations&#10;All quizzes" /></FormControl>
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
};

export default PlansTab;
