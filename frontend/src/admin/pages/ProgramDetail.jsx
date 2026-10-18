import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, useColorModeValue, useToast, HStack, VStack,
  Icon, Input, FormControl, FormLabel, Textarea, Switch, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, Avatar,
  Divider, Tooltip, IconButton, GridItem, Card, CardBody, CardHeader,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiEdit2, FiSave, FiX, FiTrash2, FiUser, FiUserPlus,
  FiBookOpen, FiClipboard, FiHeart, FiSearch, FiPlus, FiCheckCircle,
  FiGrid, FiUsers, FiCalendar, FiExternalLink, FiShield, FiAward, FiZap,
  FiUsers as FiEducators,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import {
  getProgramById, updateProgram, toggleProgram, deleteProgram,
  getProgramResources, addProgramResource, removeProgramResource,
  getEnrollmentsByProgram, removeUserFromProgram, addUserToProgram,
  getUsers, getCourses, getQuizzes, getClinicalCases, getFlashcards,
  addEducatorToProgram, removeEducatorFromProgram,
} from '../services/api';

// ─── Motion ───────────────────────────────────────────────────────────
const cardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ─── Constants ────────────────────────────────────────────────────────
const RESOURCE_CFG = {
  course: { label: 'Course', icon: FiBookOpen, colorScheme: 'blue' },
  quiz: { label: 'Quiz', icon: FiClipboard, colorScheme: 'purple' },
  clinical_case: { label: 'Clinical Case', icon: FiHeart, colorScheme: 'pink' },
};
const RESOURCE_TYPES = Object.keys(RESOURCE_CFG);

const PROGRAM_TYPE_OPTIONS = [
  { value: 'free_access', label: 'Free Access' },
  { value: 'discount_access', label: 'Discount Access' },
  { value: 'quiz_bundle', label: 'Quiz Bundle' },
  { value: 'clinical_cases_bundle', label: 'Clinical Cases Bundle' },
  { value: 'premium_unlock', label: 'Premium Unlock' },
];

// ─── Component ────────────────────────────────────────────────────────
const AdminProgramDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  // ── State ──────────────────────────────────────────────────────
  const [program, setProgram] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [resources, setResources] = useState([]);
  const [educators, setEducators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Edit
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  // Add student
  const { isOpen: addUserOpen, onOpen: onAddUserOpen, onClose: onAddUserClose } = useDisclosure();
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [addingUserId, setAddingUserId] = useState(null);

  // Remove student
  const { isOpen: removeStuOpen, onOpen: onRemoveStuOpen, onClose: onRemoveStuClose } = useDisclosure();
  const [removingEnrollment, setRemovingEnrollment] = useState(null);

  // Add resource
  const { isOpen: addResOpen, onOpen: onAddResOpen, onClose: onAddResClose } = useDisclosure();
  const [addResType, setAddResType] = useState('course');
  const [availableItems, setAvailableItems] = useState([]);
  const [availSearch, setAvailSearch] = useState('');
  const [addingResId, setAddingResId] = useState(null);

  // Add educator
  const { isOpen: addEduOpen, onOpen: onAddEduOpen, onClose: onAddEduClose } = useDisclosure();
  const [educatorSearch, setEducatorSearch] = useState('');
  const [addingEduId, setAddingEduId] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [progRes, enrollRes, resRes] = await Promise.all([
        getProgramById(id),
        getEnrollmentsByProgram(id),
        getProgramResources(id),
      ]);
      const p = progRes.data.program || progRes.data;
      setProgram(p);
      setForm({
        title: p.title || '',
        description: p.description || '',
        code: p.code || '',
        programType: p.programType || 'free_access',
        discountPercentage: p.discountPercentage || '',
        freeAccess: p.freeAccess || false,
        maxUsers: p.maxUsers || '',
        expiresAt: p.expiresAt ? dayjs(p.expiresAt).format('YYYY-MM-DD') : '',
        active: p.active !== false,
      });
      setEnrollments(enrollRes.data.enrollments || []);
      setResources(resRes.data.programResources || resRes.data.resources || []);
      setEducators(p.educators || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load program');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, [id]);

  // ── Fetch users ───────────────────────────────────────────────
  const fetchUsers = async (role) => {
    try {
      const { data } = await getUsers();
      const users = data.users || data || [];
      setAllUsers(users);
      return users;
    } catch { return []; }
  };
  useEffect(() => { if (addUserOpen) fetchUsers('student'); }, [addUserOpen]);
  useEffect(() => { if (addEduOpen) fetchUsers('educator'); }, [addEduOpen]);

  // ── Fetch available resources ────────────────────────────────
  useEffect(() => {
    if (!addResOpen) return;
    (async () => {
      try {
        setAvailableItems([]);
        let items = [];
        if (addResType === 'course') {
          const { data } = await getCourses({ limit: 200 });
          items = (data.courses || data || []).map((c) => ({ ...c, _type: 'course' }));
        } else if (addResType === 'quiz') {
          const { data } = await getQuizzes({ limit: 200 });
          items = (data.quizzes || data || []).map((q) => ({ ...q, _type: 'quiz' }));
        } else if (addResType === 'clinical_case') {
          const { data } = await getClinicalCases({ limit: 200 });
          items = (data.clinicalCases || data || []).map((cc) => ({ ...cc, _type: 'clinical_case' }));
        } else if (addResType === 'flashcard') {
          const { data } = await getFlashcards({ limit: 200 });
          items = (data.flashcards || data || []).map((f) => ({ ...f, _type: 'flashcard' }));
        }
        setAvailableItems(items);
      } catch { /* silent */ }
    })();
  }, [addResOpen, addResType]);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProgram(id, {
        ...form,
        discountPercentage: parseFloat(form.discountPercentage) || 0,
        maxUsers: form.maxUsers ? parseInt(form.maxUsers) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
      });
      toast({ title: 'Program updated', status: 'success', duration: 3000 });
      setIsEditing(false);
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Update failed', status: 'error', duration: 3000 });
    } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    try {
      await toggleProgram(id);
      toast({ title: `Program ${program.active ? 'deactivated' : 'activated'}`, status: 'success', duration: 2000 });
      fetchData();
    } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${program?.title}" and all resources?`)) return;
    try {
      await deleteProgram(id);
      toast({ title: 'Deleted', status: 'success', duration: 3000 });
      navigate('/admin/programs');
    } catch { toast({ title: 'Error', status: 'error', duration: 3000 }); }
  };

  // ── Student actions ──────────────────────────────────────────
  const handleRemoveStudent = async () => {
    if (!removingEnrollment) return;
    try {
      await removeUserFromProgram(removingEnrollment._id);
      toast({ title: 'Student removed', status: 'success', duration: 3000 });
      setRemovingEnrollment(null);
      onRemoveStuClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    }
  };

  const handleAddStudent = async (userId) => {
    setAddingUserId(userId);
    try {
      await addUserToProgram(id, userId);
      toast({ title: 'Student added', status: 'success', duration: 3000 });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed', status: 'error', duration: 3000 });
    } finally { setAddingUserId(null); }
  };

  // ── Resource actions ─────────────────────────────────────────
  const handleAddResource = async (item) => {
    setAddingResId(item._id);
    try {
      await addProgramResource(id, { resourceType: item._type, resourceId: item._id });
      toast({ title: 'Resource added', status: 'success', duration: 3000 });
      onAddResClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 });
    } finally { setAddingResId(null); }
  };

  const handleRemoveResource = async (resource) => {
    if (!window.confirm(`Remove this resource from the program?`)) return;
    try {
      await removeProgramResource(resource._id);
      toast({ title: 'Resource removed', status: 'success', duration: 3000 });
      fetchData();
    } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); }
  };

  // ── Educator actions ─────────────────────────────────────────
  const handleAddEducator = async (userId) => {
    setAddingEduId(userId);
    try {
      await addEducatorToProgram(id, userId);
      toast({ title: 'Educator added', status: 'success', duration: 3000 });
      setEducatorSearch('');
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed', status: 'error', duration: 3000 });
    } finally { setAddingEduId(null); }
  };

  const handleRemoveEducator = async (educatorId) => {
    if (!window.confirm('Remove this educator from the program?')) return;
    try {
      await removeEducatorFromProgram(id, educatorId);
      toast({ title: 'Educator removed', status: 'success', duration: 3000 });
      fetchData();
    } catch { toast({ title: 'Error', status: 'error', duration: 2000 }); }
  };

  // ── Derived data ─────────────────────────────────────────────
  const enrolledUserIds = useMemo(
    () => new Set(enrollments.map((e) => e.userId?._id?.toString() || e.userId?.toString())),
    [enrollments]
  );

  const filteredUsers = allUsers.filter((u) => {
    const uid = u._id?.toString();
    const name = (u.username || u.name || u.email || '').toLowerCase();
    return !enrolledUserIds.has(uid) && name.includes(userSearch.toLowerCase());
  });

  const filteredEducators = allUsers.filter((u) => {
    const uid = u._id?.toString();
    const name = (u.username || u.name || u.email || '').toLowerCase();
    const isOwner = program?.owner?._id?.toString() === uid;
    const isAlready = educators.some((e) => {
      const eid = e._id?.toString() || e?.toString();
      return eid === uid;
    });
    return u.role === 'educator' && !isOwner && !isAlready && name.includes(educatorSearch.toLowerCase());
  });

  const existingResKeys = useMemo(
    () => new Set(resources.map((r) => `${r.resourceType}:${(r.resourceId?._id || r.resourceId)?.toString()}`)),
    [resources]
  );

  const filteredAvailItems = availableItems.filter((item) => {
    const key = `${item._type}:${item._id}`;
    const name = (item.title || item.name || '').toLowerCase();
    return !existingResKeys.has(key) && name.includes(availSearch.toLowerCase());
  });

  const getResCfg = (t) => RESOURCE_CFG[t] || { label: t, icon: FiGrid, colorScheme: 'gray' };

  // ── Loading / Error ──────────────────────────────────────────
  if (loading) return <Flex justify="center" py={20}><Spinner size="xl" color="primary.500" /></Flex>;
  if (error) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  if (!program) return <Alert status="warning" borderRadius="md">Program not found</Alert>;

  const ownerName = program.owner?.username || program.owner?.name || 'System';
  const educatorCount = educators.length + (program.owner ? 1 : 0);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Box>
      {/* ── Top nav ──────────────────────────────────────────── */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Flex align="center" gap={3}>
          <IconButton icon={<FiArrowLeft />} variant="ghost"
            onClick={() => navigate('/admin/programs')} aria-label="Back" />
          <Box>
            <Text fontSize="sm" color={mutedColor}>
              <Text as="span" cursor="pointer" _hover={{ color: 'primary.500' }}
                onClick={() => navigate('/admin/programs')}>Programs</Text>
              {' '}/ {program.title}
            </Text>
          </Box>
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} alignItems="start">
        {/* ════════════ LEFT SIDEBAR — Program Info ════════════ */}
        <GridItem colSpan={{ base: 1, lg: 1 }}>
          <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardHeader
              bgGradient="linear(135deg, primary.500, primary.700)"
              color="white"
              borderTopRadius="xl"
              px={6}
              py={5}
            >
              <Flex justify="space-between" align="center" mb={2}>
                <Badge colorScheme="whiteAlpha" variant="solid" fontSize="2xs" px={2}>
                  {String(program.programType || '').replace(/_/g, ' ')}
                </Badge>
                <Badge colorScheme={program.active ? 'green' : 'red'} variant="solid" fontSize="2xs">
                  {program.active ? 'Active' : 'Inactive'}
                </Badge>
              </Flex>
              <Heading size="md" mb={1}>{program.title}</Heading>
              <Text fontSize="sm" opacity={0.85}>Code: {program.code}</Text>
            </CardHeader>
            <CardBody px={6} py={5}>
              {!isEditing ? (
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="bold" textTransform="uppercase">Description</Text>
                    <Text fontSize="sm" mt={1}>{program.description}</Text>
                  </Box>
                  <Divider />
                  <SimpleGrid columns={2} spacing={4}>
                    {[
                      { label: 'Type', value: program.freeAccess ? 'Free' : 'Paid' },
                      { label: 'Discount', value: `${program.discountPercentage || 0}% off` },
                      { label: 'Capacity', value: `${program.currentUsers || 0} / ${program.maxUsers || 'Unlimited'}` },
                      { label: 'Expires', value: program.expiresAt ? dayjs(program.expiresAt).format('MMM D, YYYY') : 'Never' },
                    ].map((f) => (
                      <Box key={f.label}>
                        <Text fontSize="xs" color={mutedColor} fontWeight="bold" textTransform="uppercase">{f.label}</Text>
                        <Text fontSize="sm" mt={1}>{f.value}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="bold" textTransform="uppercase">Owner</Text>
                    <Flex align="center" gap={2} mt={1}>
                      <Avatar size="2xs" name={ownerName} bg="primary.500" color="white" />
                      <Text fontSize="sm">{ownerName}</Text>
                    </Flex>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={mutedColor} fontWeight="bold" textTransform="uppercase">Educators ({educatorCount})</Text>
                    <Flex wrap="wrap" gap={1} mt={1}>
                      {program.owner && (
                        <Badge colorScheme="primary" variant="subtle" fontSize="2xs" px={1.5} py={0.5}>
                          {ownerName} (owner)
                        </Badge>
                      )}
                      {educators.map((e) => (
                        <Badge key={e._id || e} colorScheme="purple" variant="subtle" fontSize="2xs" px={1.5} py={0.5}>
                          {e.username || e.name || e.email || 'Educator'}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                  <Button mt={2} w="full" leftIcon={<FiEdit2 />} colorScheme="primary"
                    onClick={() => setIsEditing(true)}>
                    Edit Program
                  </Button>
                </VStack>
              ) : (
                <VStack align="stretch" spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="xs">Title</FormLabel>
                    <Input size="sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs">Code</FormLabel>
                    <Input size="sm" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs">Description</FormLabel>
                    <Textarea size="sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </FormControl>
                  <SimpleGrid columns={2} spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs">Type</FormLabel>
                      <Select size="sm" value={form.programType} onChange={(e) => setForm({ ...form, programType: e.target.value })}>
                        {PROGRAM_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Discount (%)</FormLabel>
                      <Input size="sm" type="number" value={form.discountPercentage}
                        onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Max Users</FormLabel>
                      <Input size="sm" type="number" value={form.maxUsers}
                        onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} placeholder="Unlimited" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Expires At</FormLabel>
                      <Input size="sm" type="date" value={form.expiresAt}
                        onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                    </FormControl>
                  </SimpleGrid>
                  <FormControl display="flex" alignItems="center" gap={3}>
                    <FormLabel fontSize="xs" mb="0">Free Access</FormLabel>
                    <Switch isChecked={form.freeAccess}
                      onChange={(e) => setForm({ ...form, freeAccess: e.target.checked })} />
                  </FormControl>
                  <Flex gap={2} mt={2}>
                    <Button size="sm" w="full" variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setForm({
                        title: program.title, description: program.description, code: program.code,
                        programType: program.programType, discountPercentage: program.discountPercentage || '',
                        freeAccess: program.freeAccess || false, maxUsers: program.maxUsers || '',
                        expiresAt: program.expiresAt ? dayjs(program.expiresAt).format('YYYY-MM-DD') : '',
                      });
                    }}>Cancel</Button>
                    <Button size="sm" w="full" colorScheme="primary" leftIcon={<FiSave />}
                      onClick={handleSave} isLoading={saving}>Save</Button>
                  </Flex>
                </VStack>
              )}
            </CardBody>
          </Card>

          {/* ── Quick actions card ─────────────────────────────── */}
          <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} mt={4}>
            <CardBody px={6} py={4}>
              <Text fontSize="xs" color={mutedColor} fontWeight="bold" textTransform="uppercase" mb={3}>Actions</Text>
              <VStack spacing={2} align="stretch">
                <Button size="sm" variant="outline" colorScheme="orange" onClick={handleToggle}>
                  {program.active ? 'Deactivate Program' : 'Activate Program'}
                </Button>
                <Button size="sm" variant="outline" colorScheme="error" leftIcon={<FiTrash2 />} onClick={handleDelete}>
                  Delete Program
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* ════════════ RIGHT COLUMN — Sections ════════════ */}
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <VStack spacing={6} align="stretch">

            {/* ── RESOURCES ──────────────────────────────────── */}
            <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardHeader px={6} py={4} borderBottomWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <Icon as={FiGrid} /> Resources ({resources.length})
                  </Heading>
                  <Button size="sm" colorScheme="primary" leftIcon={<FiPlus />} onClick={onAddResOpen}>
                    Add Resource
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody px={6} py={4}>
                {resources.length === 0 ? (
                  <Text color="gray.400" fontStyle="italic" fontSize="sm" textAlign="center" py={4}>
                    No resources linked to this program.
                  </Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <AnimatePresence mode="popLayout">
                      {resources.map((res) => {
                        const cfg = getResCfg(res.resourceType);
                        const TypeIcon = cfg.icon;
                        const item = res.resourceId || {};
                        const title = item.title || item.name || '(removed)';
                        return (
                          <motion.div key={res._id} layout {...cardMotion}>
                            <Flex p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg"
                              align="center" gap={3} transition="all 0.2s"
                              _hover={{ bg: useColorModeValue(`${cfg.colorScheme}.50`, `${cfg.colorScheme}.900`) }}>
                              <Box bg={useColorModeValue(`${cfg.colorScheme}.100`, `${cfg.colorScheme}.800`)}
                                p={2} borderRadius="md" color={`${cfg.colorScheme}.600`}>
                                <TypeIcon size={16} />
                              </Box>
                              <Box flex="1" minW={0}>
                                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{title}</Text>
                                <Text fontSize="xs" color={mutedColor}>{cfg.label}</Text>
                              </Box>
                              <Tooltip label="Remove">
                                <IconButton size="xs" icon={<FiTrash2 />} colorScheme="error" variant="ghost"
                                  onClick={() => handleRemoveResource(res)} aria-label="Remove" />
                              </Tooltip>
                            </Flex>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </SimpleGrid>
                )}
              </CardBody>
            </Card>

            {/* ── STUDENTS ────────────────────────────────────── */}
            <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardHeader px={6} py={4} borderBottomWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <Icon as={FiUsers} /> Students ({enrollments.length})
                  </Heading>
                  <Button size="sm" colorScheme="primary" leftIcon={<FiUserPlus />} onClick={onAddUserOpen}>
                    Add Student
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody px={6} py={4}>
                {enrollments.length === 0 ? (
                  <Text color="gray.400" fontStyle="italic" fontSize="sm" textAlign="center" py={4}>
                    No students enrolled yet.
                  </Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <AnimatePresence mode="popLayout">
                      {enrollments.map((enr) => {
                        const u = enr.userId || {};
                        return (
                          <motion.div key={enr._id} layout {...cardMotion}>
                            <Flex p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg"
                              align="center" gap={3} transition="all 0.2s" _hover={{ bg: hoverBg }}>
                              <Avatar size="sm" name={u.username || u.name || 'User'} />
                              <Box minW={0} flex="1">
                                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                                  {u.username || u.name || 'Unknown'}
                                </Text>
                                <HStack spacing={2} fontSize="xs" color={mutedColor}>
                                  <Text noOfLines={1}>{u.email || '—'}</Text>
                                  <Badge colorScheme={enr.completedAt ? 'success' : 'gray'} fontSize="2xs">
                                    {enr.completedAt ? 'Done' : 'Active'}
                                  </Badge>
                                </HStack>
                              </Box>
                              <Tooltip label="Remove student">
                                <IconButton size="xs" icon={<FiX />} colorScheme="error" variant="ghost"
                                  onClick={() => { setRemovingEnrollment(enr); onRemoveStuOpen(); }}
                                  aria-label="Remove" />
                              </Tooltip>
                            </Flex>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </SimpleGrid>
                )}
              </CardBody>
            </Card>

            {/* ── EDUCATORS ───────────────────────────────────── */}
            <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardHeader px={6} py={4} borderBottomWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <Icon as={FiEducators} /> Educators ({educatorCount})
                  </Heading>
                  <Button size="sm" colorScheme="primary" leftIcon={<FiUserPlus />} onClick={onAddEduOpen}>
                    Assign Educator
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody px={6} py={4}>
                {educatorCount === 0 ? (
                  <Text color="gray.400" fontStyle="italic" fontSize="sm" textAlign="center" py={4}>
                    No educators assigned to this program.
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {/* Owner */}
                    {program.owner && (
                      <Flex p={3} bg={useColorModeValue('primary.50', 'primary.900')} borderRadius="lg"
                        align="center" gap={3}>
                        <Avatar size="sm" name={ownerName} bg="primary.500" color="white" />
                        <Box flex="1">
                          <Text fontWeight="semibold" fontSize="sm">{ownerName}</Text>
                          <HStack spacing={2} fontSize="xs" color={mutedColor}>
                            <Text>{program.owner?.email || ''}</Text>
                            <Badge colorScheme="primary" variant="solid" fontSize="2xs">Owner</Badge>
                          </HStack>
                        </Box>
                      </Flex>
                    )}
                    {/* Assigned educators */}
                    <AnimatePresence mode="popLayout">
                      {educators.map((e) => {
                        const eid = e._id?.toString() || e?.toString();
                        const name = e.username || e.name || e.email || 'Educator';
                        return (
                          <motion.div key={eid} layout {...cardMotion}>
                            <Flex p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg"
                              align="center" gap={3} transition="all 0.2s" _hover={{ bg: hoverBg }}>
                              <Avatar size="sm" name={name} bg="purple.500" color="white" />
                              <Box flex="1">
                                <Text fontWeight="semibold" fontSize="sm">{name}</Text>
                                <Text fontSize="xs" color={mutedColor}>{e.email || ''}</Text>
                              </Box>
                              <Tooltip label="Remove educator">
                                <IconButton size="xs" icon={<FiTrash2 />} colorScheme="error" variant="ghost"
                                  onClick={() => handleRemoveEducator(eid)} aria-label="Remove" />
                              </Tooltip>
                            </Flex>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </VStack>
                )}
              </CardBody>
            </Card>

          </VStack>
        </GridItem>
      </SimpleGrid>

      {/* ── MODALS ─────────────────────────────────────────────── */}

      {/* Add Student */}
      <Modal isOpen={addUserOpen} onClose={onAddUserClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Student</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4}>
            <Input placeholder="Search by name or email..." value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)} mb={4} borderRadius="lg" />
            {filteredUsers.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                {userSearch ? 'No matching users' : 'All users already enrolled'}
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="400px" overflowY="auto">
                {filteredUsers.slice(0, 50).map((u) => (
                  <motion.div key={u._id} {...cardMotion}>
                    <Flex p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                      align="center" justify="space-between" _hover={{ bg: hoverBg }}>
                      <HStack spacing={3} minW={0}>
                        <Avatar size="sm" name={u.username || u.name || 'User'} />
                        <Box minW={0}>
                          <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                            {u.username || u.name || 'Unknown'}
                          </Text>
                          <Text fontSize="xs" color={mutedColor} noOfLines={1}>{u.email || '—'}</Text>
                        </Box>
                      </HStack>
                      <Button size="xs" colorScheme="primary" flexShrink={0}
                        isLoading={addingUserId === u._id}
                        onClick={() => handleAddStudent(u._id)}>Enroll</Button>
                    </Flex>
                  </motion.div>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onAddUserClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Remove Student */}
      <Modal isOpen={removeStuOpen} onClose={onRemoveStuClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Remove Student</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Remove <strong>{removingEnrollment?.userId?.username || removingEnrollment?.userId?.name || 'this student'}</strong> from <strong>{program?.title}</strong>?</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onRemoveStuClose} mr={3}>Cancel</Button>
            <Button colorScheme="error" onClick={handleRemoveStudent}>Remove</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Resource */}
      <Modal isOpen={addResOpen} onClose={onAddResClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Resource</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4}>
            <HStack spacing={3} mb={4}>
              <Select value={addResType} onChange={(e) => setAddResType(e.target.value)} maxW="200px" borderRadius="lg">
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{RESOURCE_CFG[rt].label}</option>
                ))}
              </Select>
              <Input placeholder="Search..." value={availSearch}
                onChange={(e) => setAvailSearch(e.target.value)} borderRadius="lg" />
            </HStack>
            {filteredAvailItems.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                {availSearch ? 'No matches' : 'All available items already added'}
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="400px" overflowY="auto">
                {filteredAvailItems.slice(0, 50).map((item) => (
                  <motion.div key={item._id} {...cardMotion}>
                    <Flex p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                      align="center" justify="space-between" _hover={{ bg: hoverBg }}>
                      <Box minW={0} flex="1">
                        <Text fontWeight="medium" fontSize="sm" noOfLines={1}>{item.title || item.name}</Text>
                        <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                          {item.specialty || item.difficulty || item.category || ''}
                        </Text>
                      </Box>
                      <Button size="xs" colorScheme="primary" leftIcon={<FiPlus />} flexShrink={0} ml={2}
                        isLoading={addingResId === item._id}
                        onClick={() => handleAddResource(item)}>Add</Button>
                    </Flex>
                  </motion.div>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onAddResClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Assign Educator */}
      <Modal isOpen={addEduOpen} onClose={onAddEduClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Assign Educator</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4}>
            <Input placeholder="Search educators by name or email..." value={educatorSearch}
              onChange={(e) => setEducatorSearch(e.target.value)} mb={4} borderRadius="lg" />
            {filteredEducators.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                {educatorSearch ? 'No matching educators' : 'All educators already assigned'}
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="400px" overflowY="auto">
                {filteredEducators.slice(0, 50).map((u) => (
                  <motion.div key={u._id} {...cardMotion}>
                    <Flex p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                      align="center" justify="space-between" _hover={{ bg: hoverBg }}>
                      <HStack spacing={3} minW={0}>
                        <Avatar size="sm" name={u.username || u.name || 'User'} bg="purple.500" color="white" />
                        <Box minW={0}>
                          <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                            {u.username || u.name || 'Unknown'}
                          </Text>
                          <Text fontSize="xs" color={mutedColor} noOfLines={1}>{u.email || '—'}</Text>
                        </Box>
                      </HStack>
                      <Button size="xs" colorScheme="purple" flexShrink={0} leftIcon={<FiPlus />}
                        isLoading={addingEduId === u._id}
                        onClick={() => handleAddEducator(u._id)}>Assign</Button>
                    </Flex>
                  </motion.div>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onAddEduClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminProgramDetail;
