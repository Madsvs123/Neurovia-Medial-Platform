import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, IconButton, useColorModeValue, useToast, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure,
  FormControl, FormLabel, Input, Textarea, Select, Switch,
  VStack, HStack, Divider, Stat, StatLabel, StatNumber,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiToggleLeft, FiToggleRight, FiDollarSign, FiClock } from 'react-icons/fi';
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, toggleSubscriptionPlan, deleteSubscriptionPlan } from '../services/api';

const SubscriptionPlans = () => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [form, setForm] = useState({
    name: '', description: '', price: '', currency: 'USD', billingCycle: 'monthly',
    aiLimits: '100', quizAccess: true, clinicalCaseAccess: true, doctorToolsAccess: false,
    features: '', active: true,
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getSubscriptionPlans({ limit: 50 });
      setPlans(data.subscriptionPlans || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ name: '', description: '', price: '', currency: 'USD', billingCycle: 'monthly', aiLimits: '100', quizAccess: true, clinicalCaseAccess: true, doctorToolsAccess: false, features: '', active: true });
    onOpen();
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name || '', description: plan.description || '', price: plan.price?.toString() || '',
      currency: plan.currency || 'USD', billingCycle: plan.billingCycle || 'monthly',
      aiLimits: plan.aiLimits?.toString() || '100', quizAccess: plan.quizAccess ?? true,
      clinicalCaseAccess: plan.clinicalCaseAccess ?? true, doctorToolsAccess: plan.doctorToolsAccess ?? false,
      features: plan.features?.join('\n') || '', active: plan.active ?? true,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price || !form.billingCycle) {
      toast({ title: 'Fill required fields', status: 'warning', duration: 3000 }); return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form, price: parseFloat(form.price), aiLimits: parseInt(form.aiLimits) || 100,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
      };
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan._id, payload);
        toast({ title: 'Plan updated', status: 'success', duration: 3000 });
      } else {
        await createSubscriptionPlan(payload);
        toast({ title: 'Plan created', status: 'success', duration: 3000 });
      }
      onClose(); fetchPlans();
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  const handleToggle = async (plan) => {
    try { await toggleSubscriptionPlan(plan._id); fetchPlans();
      toast({ title: `Plan ${plan.active ? 'deactivated' : 'activated'}`, status: 'success', duration: 2000 });
    } catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    try { await deleteSubscriptionPlan(plan._id); toast({ title: 'Plan deleted', status: 'success', duration: 3000 }); fetchPlans(); }
    catch (err) { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">Subscription Plans</Heading><Text color="gray.500" mt={1}>{plans.length} plans</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchPlans} aria-label="Refresh" /></Tooltip>
          <Button colorScheme="teal" leftIcon={<FiPlus />} onClick={openCreate}>New Plan</Button>
        </HStack>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : plans.length === 0 ? <Box textAlign="center" py={20} color="gray.400">No plans</Box>
        : <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {plans.map((plan) => (
              <Box key={plan._id} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}
                shadow="sm" overflow="hidden" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Box h="4px" bg={plan.active ? 'teal.400' : 'gray.300'} />
                <Box p={5}>
                  <Flex justify="space-between" align="start" mb={2}>
                    <Box>
                      <Heading size="md">{plan.name}</Heading>
                      <Flex align="center" gap={2} mt={1}>
                        <Badge colorScheme={plan.active ? 'green' : 'gray'}>{plan.active ? 'Active' : 'Inactive'}</Badge>
                        <Badge colorScheme={plan.billingCycle === 'yearly' ? 'blue' : 'cyan'}>{plan.billingCycle}</Badge>
                      </Flex>
                    </Box>
                    <Text fontSize="2xl" fontWeight="bold" color="teal.500">
                      ${plan.price}<Text as="span" fontSize="sm" color="gray.400">/{plan.billingCycle === 'yearly' ? 'yr' : 'mo'}</Text>
                    </Text>
                  </Flex>

                  <Text fontSize="sm" color="gray.500" noOfLines={2} mb={3}>{plan.description}</Text>

                  <Box mb={3}>
                    {plan.features?.slice(0, 4).map((f, i) => (
                      <Text key={i} fontSize="xs" color="gray.600" mb={1}>✓ {f}</Text>
                    ))}
                    {plan.features?.length > 4 && <Text fontSize="xs" color="gray.400">+{plan.features.length - 4} more</Text>}
                  </Box>

                  <Divider mb={3} />
                  <SimpleGrid columns={2} spacing={2} mb={4} fontSize="xs">
                    <Stat size="sm"><StatLabel>AI Conversations</StatLabel><StatNumber>{plan.aiLimits === 999999 ? '∞' : plan.aiLimits}</StatNumber></Stat>
                    <Stat size="sm">
                      <StatLabel>Access</StatLabel>
                      <StatNumber>
                        {['Quiz', 'Case', 'Tool'].filter((_, i) => [plan.quizAccess, plan.clinicalCaseAccess, plan.doctorToolsAccess][i]).join(', ') || 'Basic'}
                      </StatNumber>
                    </Stat>
                  </SimpleGrid>

                  <Flex gap={2}>
                    <Button size="sm" variant="outline" flex={1} leftIcon={<FiEdit2 />} onClick={() => openEdit(plan)}>Edit</Button>
                    <Button size="sm" variant="outline" flex={1}
                      leftIcon={plan.active ? <FiToggleLeft /> : <FiToggleRight />}
                      colorScheme={plan.active ? 'orange' : 'green'}
                      onClick={() => handleToggle(plan)}>{plan.active ? 'Deactivate' : 'Activate'}</Button>
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => handleDelete(plan)} aria-label="Delete" />
                  </Flex>
                </Box>
              </Box>
            ))}
          </SimpleGrid>}

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingPlan ? 'Edit Plan' : 'New Subscription Plan'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Name</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro Monthly" /></FormControl>
                <FormControl isRequired><FormLabel>Price ($)</FormLabel><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></FormControl>
              </SimpleGrid>
              <FormControl isRequired><FormLabel>Description</FormLabel><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></FormControl>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired><FormLabel>Billing Cycle</FormLabel><Select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></FormControl>
                <FormControl><FormLabel>Currency</FormLabel><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option></Select></FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl><FormLabel>AI Limit</FormLabel><Input type="number" value={form.aiLimits} onChange={(e) => setForm({ ...form, aiLimits: e.target.value })} /></FormControl>
                <FormControl display="flex" alignItems="flex-end" pb={2}>
                  <FormLabel mb={0} mr={4}>Active</FormLabel>
                  <Switch isChecked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={3} spacing={4} w="full">
                <FormControl display="flex" alignItems="center" gap={2}>
                  <Switch isChecked={form.quizAccess} onChange={(e) => setForm({ ...form, quizAccess: e.target.checked })} />
                  <FormLabel mb={0}>Quiz Access</FormLabel>
                </FormControl>
                <FormControl display="flex" alignItems="center" gap={2}>
                  <Switch isChecked={form.clinicalCaseAccess} onChange={(e) => setForm({ ...form, clinicalCaseAccess: e.target.checked })} />
                  <FormLabel mb={0}>Cases Access</FormLabel>
                </FormControl>
                <FormControl display="flex" alignItems="center" gap={2}>
                  <Switch isChecked={form.doctorToolsAccess} onChange={(e) => setForm({ ...form, doctorToolsAccess: e.target.checked })} />
                  <FormLabel mb={0}>Tools Access</FormLabel>
                </FormControl>
              </SimpleGrid>
              <FormControl><FormLabel>Features (one per line)</FormLabel><Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} placeholder="All quizzes&#10;Clinical cases&#10;Certificates" /></FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleSave} isLoading={saving}>{editingPlan ? 'Update' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SubscriptionPlans;
