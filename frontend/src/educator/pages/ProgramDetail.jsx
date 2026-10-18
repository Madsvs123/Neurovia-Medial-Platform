import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, Card, CardBody, CardHeader, SimpleGrid,
  useToast, HStack, VStack, Table, Thead, Tbody, Tr, Th, Td, TableContainer, 
  useDisclosure, Divider, IconButton, Modal, ModalOverlay, ModalContent, 
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Input, Select, 
  Textarea, GridItem, FormControl, FormLabel, Switch, Avatar
} from '@chakra-ui/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserInfo } from '../utils/auth';
import { FiArrowLeft, FiBookOpen, FiClipboard, FiHeart, FiExternalLink, FiUsers, FiX, FiEdit2, FiPlus, FiTrash2, FiSave, FiUserPlus, FiLogOut, FiZap } from 'react-icons/fi';
import { getProgramById, getProgramResources, updateProgram, toggleProgram, deleteProgram, getEnrollmentsByProgram, removeUserFromProgram, getCourses, getQuizzes, getClinicalCases, getFlashcards, addProgramResource, removeProgramResource, addEducatorToProgram, removeEducatorFromProgram, getEducators, getUsers, addUserToProgram } from '../services/api';

const EducatorProgramDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [program, setProgram] = useState(null);
  const [resources, setResources] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [availCourses, setAvailCourses] = useState([]);
  const [availQuizzes, setAvailQuizzes] = useState([]);
  const [availCases, setAvailCases] = useState([]);
  const [availFlashcards, setAvailFlashcards] = useState([]);
  const [resourceTab, setResourceTab] = useState(0);
  const currentUser = getUserInfo();
  const [addingEduId, setAddingEduId] = useState(null);
  const [eduSearch, setEduSearch] = useState('');
  const [allEducators, setAllEducators] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: eduOpen, onOpen: onOpenEdu, onClose: onCloseEdu } = useDisclosure();
  const { isOpen: addUserOpen, onOpen: onAddUserOpen, onClose: onAddUserClose } = useDisclosure();
  const { isOpen: removeStuOpen, onOpen: onRemoveStuOpen, onClose: onRemoveStuClose } = useDisclosure();
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [addingUserId, setAddingUserId] = useState(null);
  const [removingEnrollment, setRemovingEnrollment] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [progRes, resRes, enrollRes] = await Promise.all([
          getProgramById(id),
          getProgramResources(id),
          getEnrollmentsByProgram(id)
        ]);
        
        setProgram(progRes.data.program);
        setResources(resRes.data.programResources || []);
        setEnrollments(enrollRes.data.enrollments || []);
        
        setForm({
          title: progRes.data.program.title,
          description: progRes.data.program.description,
          code: progRes.data.program.code,
          programType: progRes.data.program.programType,
          discountPercentage: progRes.data.program.discountPercentage || '',
          freeAccess: progRes.data.program.freeAccess || false,
          maxUsers: progRes.data.program.maxUsers || '',
          expiresAt: progRes.data.program.expiresAt ? new Date(progRes.data.program.expiresAt).toISOString().split('T')[0] : ''
        });
        
        const [courses, quizzes, cases, flashcards] = await Promise.all([
          getCourses({ limit: 200, mine: true }),
          getQuizzes({ limit: 200, mine: true }),
          getClinicalCases({ limit: 200 }),
          getFlashcards({ limit: 200 })
        ]);
        setAvailCourses(courses.data.courses || []);
        setAvailQuizzes(quizzes.data.quizzes || []);
        setAvailCases(cases.data.clinicalCases || []);
        setAvailFlashcards(flashcards.data.flashcards || []);
        
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load program details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        discountPercentage: form.discountPercentage ? parseFloat(form.discountPercentage) : 0,
        maxUsers: form.maxUsers ? parseInt(form.maxUsers) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
      };
      await updateProgram(id, payload);
      toast({ title: 'Program updated', status: 'success', duration: 3000 });
      const { data } = await getProgramById(id);
      setProgram(data.program);
      setIsEditing(false);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update', status: 'error', duration: 3000 });
    }
  };

  const handleToggle = async () => {
    try {
      await toggleProgram(id);
      const { data } = await getProgramById(id);
      setProgram(data.program);
      toast({ title: `Program ${program.active ? 'deactivated' : 'activated'}`, status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: 'Error toggling status', status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this program and all its resources? This cannot be undone.')) return;
    try {
      await deleteProgram(id);
      toast({ title: 'Program deleted', status: 'success', duration: 3000 });
      navigate('/educator/programs');
    } catch (err) {
      toast({ title: 'Error deleting program', status: 'error', duration: 3000 });
    }
  };

  const handleAddResource = async (resourceType, resourceId) => {
    try {
      await addProgramResource(id, { resourceType, resourceId });
      const { data } = await getProgramResources(id);
      setResources(data.programResources || []);
      toast({ title: 'Resource added', status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: 'Error adding resource', status: 'error', duration: 3000 });
    }
  };

  const handleRemoveResource = async (resourceId) => {
    try {
      await removeProgramResource(resourceId);
      const { data } = await getProgramResources(id);
      setResources(data.programResources || []);
      toast({ title: 'Resource removed', status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: 'Error removing resource', status: 'error', duration: 3000 });
    }
  };

  // ── Student management ───────────────────────────────────────
  const handleAddStudent = async (userId) => {
    setAddingUserId(userId);
    try {
      await addUserToProgram(id, userId);
      toast({ title: 'Student added', status: 'success', duration: 3000 });
      const { data } = await getEnrollmentsByProgram(id);
      setEnrollments(data.enrollments || []);
      setUserSearch('');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed', status: 'error', duration: 3000 });
    } finally { setAddingUserId(null); }
  };

  const handleRemoveStudentConfirm = async () => {
    if (!removingEnrollment) return;
    try {
      await removeUserFromProgram(removingEnrollment._id);
      toast({ title: 'Student removed', status: 'success', duration: 3000 });
      setRemovingEnrollment(null);
      onRemoveStuClose();
      const { data } = await getEnrollmentsByProgram(id);
      setEnrollments(data.enrollments || []);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed', status: 'error', duration: 3000 });
    }
  };

  // ── Educator management ──────────────────────────────────────

  const handleLeaveProgram = async () => {
    if (!window.confirm('Leave this program? You will no longer be an educator here.')) return;
    try {
      const educatorId = currentUser?.id?.toString();
      if (!educatorId) return;
      await removeEducatorFromProgram(id, educatorId);
      toast({ title: 'Left program', status: 'success', duration: 3000 });
      navigate('/educator/programs');
    } catch (err) {
      toast({ title: 'Error leaving program', status: 'error', duration: 3000 });
    }
  };

  const handleAddEducator = async (userId) => {
    setAddingEduId(userId);
    try {
      await addEducatorToProgram(id, userId);
      toast({ title: 'Educator assigned', status: 'success', duration: 3000 });
      const { data } = await getProgramById(id);
      setProgram(data.program);
      onCloseEdu();
      setEduSearch('');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to assign educator', status: 'error', duration: 3000 });
    } finally { setAddingEduId(null); }
  };

  const handleRemoveEducator = async (educatorId) => {
    if (!window.confirm('Remove this educator from the program?')) return;
    try {
      await removeEducatorFromProgram(id, educatorId);
      toast({ title: 'Educator removed', status: 'success', duration: 3000 });
      const { data } = await getProgramById(id);
      setProgram(data.program);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to remove', status: 'error', duration: 3000 });
    }
  };

  // ── Fetch educators for modal ────────────────────────────────
  useEffect(() => {
    if (!eduOpen) return;
    (async () => {
      try {
        const { data } = await getEducators();
        setAllEducators(data.educators || data || []);
      } catch { /* silent */ }
    })();
  }, [eduOpen]);

  // ── Fetch users for add-student modal ────────────────────────
  useEffect(() => {
    if (!addUserOpen) return;
    (async () => {
      try {
        const { data } = await getUsers();
        const users = data.users || data || [];
        setAllUsers(users);
      } catch { /* silent */ }
    })();
  }, [addUserOpen]);

  // ── Derived data ─────────────────────────────────────────────
  const enrolledUserIds = useMemo(() => {
    const ids = new Set();
    enrollments.forEach((e) => {
      // Handle both cases: userId as object with _id, or userId as string
      const userId = e.userId?._id || e.userId;
      if (userId) {
        ids.add(userId.toString());
      }
    });
    return ids;
  }, [enrollments]);

  const filteredUsers = allUsers.filter((u) => {
    const uid = u._id?.toString();
    const name = (u.username || u.name || u.email || '').toLowerCase();
    const isEnrolled = enrolledUserIds.has(uid);
    const matchesSearch = userSearch === '' || name.includes(userSearch.toLowerCase());
    return !isEnrolled && matchesSearch;
  });

  if (loading) return <Box py={20} textAlign="center"><Spinner size="xl" color="blue.500" /></Box>;
  if (error) return <Box py={20}><Alert status="error" borderRadius="lg"><AlertIcon /> {error}</Alert><Button as={Link} to="/educator/programs" leftIcon={<FiArrowLeft />} variant="link" colorScheme="blue" mt={4}>Back</Button></Box>;
  if (!program) return <Box py={20}><Alert status="info" borderRadius="lg"><AlertIcon /> Program not found</Alert></Box>;

  const isOwner = program?.owner?._id?.toString() === currentUser?.id?.toString();

  const getResourceLink = (res) => {
    if (res.resourceType === 'course') return `/educator/courses/${res.resourceId?._id}`;
    if (res.resourceType === 'quiz') return `/educator/quizzes/${res.resourceId?._id}`;
    if (res.resourceType === 'clinical_case') return `/educator/clinical-cases/${res.resourceId?._id}`;
    if (res.resourceType === 'flashcard') return '#';
    return '#';
  };

  const ResourceItem = ({ res, icon, color, label }) => (
    <Link to={getResourceLink(res)} style={{ textDecoration: 'none', flex: 1 }}>
      <Flex p={3} bg="gray.50" borderRadius="lg" align="center" gap={3} transition="all 0.2s" _hover={{ bg: `${color}.50`, transform: 'translateX(4px)' }}>
        <Box bg={`${color}.100`} p={2} borderRadius="md" color={`${color}.600`}>{icon}</Box>
        <Box flex="1" minW={0}>
          <Text fontWeight="semibold" fontSize="sm" noOfLines={1} color="gray.800">{res.resourceId?.title || label}</Text>
          <Text fontSize="xs" color="gray.500">{label}</Text>
        </Box>
        <Icon as={FiExternalLink} boxSize={4} color="gray.400" />
      </Flex>
    </Link>
  );

  return (
    <Box p={{ base: 4, md: 8 }}>
      <Flex justify="space-between" align="center" mb={6}>
        <Button as={Link} to="/educator/programs" leftIcon={<FiArrowLeft />} variant="ghost" colorScheme="blue" size="sm">
          Back to Programs
        </Button>
        <Flex gap={2}>
          <Button size="sm" colorScheme={program.active ? 'orange' : 'green'} variant="outline" onClick={handleToggle}>
            {program.active ? 'Deactivate' : 'Activate'}
          </Button>
          {isOwner ? (
            <Button size="sm" colorScheme="red" variant="outline" onClick={handleDelete}>Delete</Button>
          ) : (
            <Button size="sm" colorScheme="orange" variant="outline" leftIcon={<FiLogOut />} onClick={handleLeaveProgram}>Leave</Button>
          )}
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} alignItems="start">
        
        {/* Left Column: Program Details & Editing */}
        <GridItem colSpan={{ base: 1, lg: 1 }}>
          <Card bg={cardBg} borderRadius="xl" shadow="sm" borderColor={borderColor} borderWidth="1px">
            <CardHeader bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)" color="white" borderTopRadius="xl" px={6} py={5}>
              <Flex justify="space-between" align="center" mb={2}>
                <Badge colorScheme="whiteAlpha">{program.programType.replace('_', ' ')}</Badge>
                <Badge colorScheme={program.active ? 'green' : 'red'}>{program.active ? 'Active' : 'Inactive'}</Badge>
              </Flex>
              <Heading size="md" mb={1}>{program.title}</Heading>
              <Text fontSize="sm" opacity={0.9}>Code: {program.code}</Text>
            </CardHeader>
            <CardBody px={6} py={5}>
              {!isEditing ? (
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Description</Text>
                    <Text fontSize="sm" mt={1}>{program.description}</Text>
                  </Box>
                  <Divider />
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Type</Text>
                      <Text fontSize="sm" mt={1}>{program.freeAccess ? 'Free' : 'Paid'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Discount</Text>
                      <Text fontSize="sm" mt={1}>{program.discountPercentage}% off</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Capacity</Text>
                      <Text fontSize="sm" mt={1}>{program.currentUsers || 0} / {program.maxUsers || 'Unlimited'}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Expires</Text>
                      <Text fontSize="sm" mt={1}>{program.expiresAt ? new Date(program.expiresAt).toLocaleDateString() : 'Never'}</Text>
                    </Box>
                  </SimpleGrid>
                  <Button mt={2} w="full" leftIcon={<FiEdit2 />} colorScheme="teal" onClick={() => setIsEditing(true)}>
                    Edit Program Info
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
                        <option value="free_access">Free Access</option>
                        <option value="discount_access">Discount</option>
                        <option value="quiz_bundle">Quiz Bundle</option>
                        <option value="clinical_cases_bundle">Clinical Cases</option>
                        <option value="premium_unlock">Premium Unlock</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Discount (%)</FormLabel>
                      <Input size="sm" type="number" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Max Users</FormLabel>
                      <Input size="sm" type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} placeholder="Unlimited" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Expires At</FormLabel>
                      <Input size="sm" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                    </FormControl>
                  </SimpleGrid>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel fontSize="xs" mb="0">Free Access</FormLabel>
                    <Switch isChecked={form.freeAccess} onChange={(e) => setForm({ ...form, freeAccess: e.target.checked })} />
                  </FormControl>
                  <Flex gap={2} mt={2}>
                    <Button size="sm" w="full" variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setForm({
                        title: program.title, description: program.description, code: program.code,
                        programType: program.programType, discountPercentage: program.discountPercentage || '',
                        freeAccess: program.freeAccess || false, maxUsers: program.maxUsers || '',
                        expiresAt: program.expiresAt ? new Date(program.expiresAt).toISOString().split('T')[0] : ''
                      });
                    }}>Cancel</Button>
                    <Button size="sm" w="full" colorScheme="teal" leftIcon={<FiSave />} onClick={handleSave}>Save</Button>
                  </Flex>
                </VStack>
              )}
            </CardBody>
          </Card>
        </GridItem>

        {/* Right Column: Resources & Students */}
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <VStack spacing={6} align="stretch">
            
            {/* Resources Section */}
            <Card bg={cardBg} borderRadius="xl" shadow="sm" borderColor={borderColor} borderWidth="1px">
              <CardHeader px={6} py={4} borderBottomWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center">
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <FiClipboard /> Resources ({resources.length})
                  </Heading>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={onOpen}>Add Resource</Button>
                </Flex>
              </CardHeader>
              <CardBody px={6} py={4}>
                {resources.length === 0 ? (
                  <Text color="gray.500" fontStyle="italic" fontSize="sm" textAlign="center" py={4}>No resources linked to this program.</Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {resources.map((res) => (
                      <Flex key={res._id} align="center" gap={2}>
                        <ResourceItem 
                          res={res} 
                          color={res.resourceType === 'course' ? 'blue' : res.resourceType === 'quiz' ? 'purple' : res.resourceType === 'clinical_case' ? 'pink' : 'orange'} 
                          label={res.resourceType.replace('_', ' ')} 
                          icon={res.resourceType === 'course' ? <FiBookOpen size={16}/> : res.resourceType === 'quiz' ? <FiClipboard size={16}/> : res.resourceType === 'clinical_case' ? <FiHeart size={16}/> : <FiZap size={16}/>} 
                        />
                        <IconButton
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Remove"
                          onClick={() => handleRemoveResource(res._id)}
                        />
                      </Flex>
                    ))}
                  </SimpleGrid>
                )}
              </CardBody>
            </Card>

            {/* Students Section */}
            <Card bg={cardBg} borderRadius="xl" shadow="sm" borderColor={borderColor} borderWidth="1px">
              <CardHeader px={6} py={4} borderBottomWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <FiUsers /> Enrolled Students ({enrollments.length})
                  </Heading>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiUserPlus />} onClick={onAddUserOpen}>
                    Add Student
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody px={0} py={0}>
                {enrollments.length === 0 ? (
                  <Text color="gray.500" fontStyle="italic" fontSize="sm" textAlign="center" py={8}>No students enrolled yet.</Text>
                ) : (
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                        <Tr>
                          <Th px={6}>Student</Th>
                          <Th>Email</Th>
                          <Th>Joined</Th>
                          <Th px={6} textAlign="right">Action</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {enrollments.map((enrollment) => (
                          <Tr key={enrollment._id}>
                            <Td px={6}>
                              <Text fontWeight="semibold">{enrollment.userId?.username || 'Unknown'}</Text>
                              <Badge colorScheme={enrollment.userId?.role === 'student' ? 'blue' : 'purple'} fontSize="xs">
                                {enrollment.userId?.role}
                              </Badge>
                            </Td>
                            <Td>{enrollment.userId?.email}</Td>
                            <Td>{new Date(enrollment.joinedAt).toLocaleDateString()}</Td>
                            <Td px={6} textAlign="right">
                              <HStack spacing={1} justify="flex-end">
                                <IconButton
                                  icon={<FiX />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  aria-label="Remove student"
                                  onClick={() => { setRemovingEnrollment(enrollment); onRemoveStuOpen(); }}
                                />
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </CardBody>
            </Card>

            {/* Educators Section */}
            <Card bg={cardBg} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
              <CardHeader px={6} py={4} borderBottomWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Heading size="md" display="flex" alignItems="center" gap={2}>
                    <FiUsers /> Educators
                  </Heading>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={onOpenEdu}>
                    Assign Educator
                  </Button>
                </Flex>
              </CardHeader>
              <CardBody px={6} py={4}>
                {(!program.educators || program.educators.length === 0) && !program.owner ? (
                  <Text color="gray.400" fontStyle="italic" fontSize="sm" textAlign="center" py={4}>
                    No educators assigned.
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {program.owner && (
                      <Flex p={3} bg={useColorModeValue('teal.50', 'teal.900')} borderRadius="lg" align="center" gap={3}>
                        <Avatar size="sm" name={program.owner?.username || 'Owner'} bg="teal.500" color="white" />
                        <Box flex="1">
                          <Text fontWeight="semibold" fontSize="sm">{program.owner?.username || 'Owner'}</Text>
                          <Badge colorScheme="teal" variant="solid" fontSize="2xs">Owner</Badge>
                        </Box>
                      </Flex>
                    )}
                    {(program.educators || []).map((e) => {
                      const eid = e._id?.toString() || e.toString();
                      const name = e.username || e.name || e.email || 'Educator';
                      return (
                        <Flex key={eid} p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg" align="center" gap={3}>
                          <Avatar size="sm" name={name} bg="purple.500" color="white" />
                          <Box flex="1">
                            <Text fontWeight="semibold" fontSize="sm">{name}</Text>
                            <Text fontSize="xs" color="gray.500">{e.email || ''}</Text>
                          </Box>
                          {currentUser?.id?.toString() === program.owner?._id?.toString() && (
                            <IconButton size="xs" icon={<FiTrash2 />} colorScheme="red" variant="ghost"
                              onClick={() => handleRemoveEducator(eid)} aria-label="Remove educator" />
                          )}
                        </Flex>
                      );
                    })}
                  </VStack>
                )}
              </CardBody>
            </Card>

          </VStack>
        </GridItem>
      </SimpleGrid>

      {/* Add Resource Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxH="80vh">
          <ModalHeader>Add Resource</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            <Flex gap={2} mb={4} flexWrap="wrap">
              {['Courses', 'Quizzes', 'Clinical Cases', 'Flashcards'].map((l, i) => (
                <Button key={i} size="sm" variant={resourceTab === i ? 'solid' : 'ghost'}
                  colorScheme={i === 0 ? 'blue' : i === 1 ? 'purple' : i === 2 ? 'pink' : 'orange'} borderRadius="full"
                  onClick={() => setResourceTab(i)}>{l}</Button>
              ))}
            </Flex>
            <Divider mb={4} />
            {(resourceTab === 0 ? availCourses : resourceTab === 1 ? availQuizzes : resourceTab === 2 ? availCases : availFlashcards).length === 0
              ? <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>None available to add</Text>
              : <SimpleGrid columns={1} spacing={2}>
                  {(resourceTab === 0 ? availCourses : resourceTab === 1 ? availQuizzes : resourceTab === 2 ? availCases : availFlashcards)
                    .filter(item => !resources.some(r => r.resourceType === (resourceTab === 0 ? 'course' : resourceTab === 1 ? 'quiz' : resourceTab === 2 ? 'clinical_case' : 'flashcard') && r.resourceId?._id === item._id))
                    .map(item => (
                      <Flex key={item._id} p={3} bg="gray.50" borderRadius="md" align="center" gap={3} fontSize="sm">
                        <Box bg={resourceTab === 0 ? 'blue.100' : resourceTab === 1 ? 'purple.100' : resourceTab === 2 ? 'pink.100' : 'orange.100'} p={2} borderRadius="md" color={resourceTab === 0 ? 'blue.600' : resourceTab === 1 ? 'purple.600' : resourceTab === 2 ? 'pink.600' : 'orange.600'}>
                          {resourceTab === 0 ? <FiBookOpen size={14}/> : resourceTab === 1 ? <FiClipboard size={14}/> : resourceTab === 2 ? <FiHeart size={14}/> : <FiZap size={14}/>}
                        </Box>
                        <Text flex={1} fontWeight="medium">{item.title}</Text>
                        <Button size="sm" colorScheme="teal" variant="outline" leftIcon={<FiPlus />}
                          onClick={() => handleAddResource(
                            resourceTab === 0 ? 'course' : resourceTab === 1 ? 'quiz' : resourceTab === 2 ? 'clinical_case' : 'flashcard',
                            item._id
                          )}>Add</Button>
                      </Flex>
                    ))}
                </SimpleGrid>}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Student Modal */}
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
                  <Flex key={u._id} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                    align="center" justify="space-between" _hover={{ bg: hoverBg }}>
                    <HStack spacing={3} minW={0}>
                      <Avatar size="sm" name={u.username || u.name || 'User'} />
                      <Box minW={0}>
                        <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                          {u.username || u.name || 'Unknown'}
                        </Text>
                        <Text fontSize="xs" color="gray.500" noOfLines={1}>{u.email || '—'}</Text>
                      </Box>
                    </HStack>
                    <Button size="xs" colorScheme="teal" flexShrink={0}
                      isLoading={addingUserId === u._id}
                      onClick={() => handleAddStudent(u._id)}>Enroll</Button>
                  </Flex>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter><Button onClick={onAddUserClose}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Remove Student Modal */}
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
            <Button colorScheme="red" onClick={handleRemoveStudentConfirm}>Remove</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Assign Educator Modal */}
      <Modal isOpen={eduOpen} onClose={onCloseEdu} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Assign Educator</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4}>
            <Input placeholder="Search educators by name or email..." value={eduSearch}
              onChange={(e) => setEduSearch(e.target.value)} mb={4} borderRadius="lg" />
            {(() => {
              const existingIds = new Set(
                ((program.educators || [])).map(e => e._id?.toString() || e.toString())
              );
              if (program.owner) existingIds.add(program.owner._id?.toString() || program.owner.toString());
              const filtered = allEducators.filter(u => {
                const uid = u._id?.toString();
                const name = (u.username || u.name || u.email || '').toLowerCase();
                return u.role === 'educator' && !existingIds.has(uid) && name.includes(eduSearch.toLowerCase());
              });
              if (filtered.length === 0) {
                return <Text color="gray.500" textAlign="center" py={8}>{eduSearch ? 'No matching educators' : 'All educators already assigned'}</Text>;
              }
              return (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} maxH="400px" overflowY="auto">
                  {filtered.slice(0, 50).map((u) => (
                    <Flex key={u._id} p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                      align="center" justify="space-between" _hover={{ bg: hoverBg }}>
                      <HStack spacing={3} minW={0}>
                        <Avatar size="sm" name={u.username || u.name || 'User'} bg="purple.500" color="white" />
                        <Box minW={0}>
                          <Text fontWeight="medium" fontSize="sm" noOfLines={1}>{u.username || u.name || 'Unknown'}</Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>{u.email || '—'}</Text>
                        </Box>
                      </HStack>
                      <Button size="xs" colorScheme="teal" flexShrink={0} leftIcon={<FiPlus />}
                        isLoading={addingEduId === u._id}
                        onClick={() => handleAddEducator(u._id)}>Assign</Button>
                    </Flex>
                  ))}
                </SimpleGrid>
              );
            })()}
          </ModalBody>
          <ModalFooter><Button onClick={onCloseEdu}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EducatorProgramDetail;