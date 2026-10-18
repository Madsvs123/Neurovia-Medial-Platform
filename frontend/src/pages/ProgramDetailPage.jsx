import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, useToast, HStack, VStack, Divider, Card, CardBody, SimpleGrid,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiBookOpen, FiClipboard, FiHeart,
  FiUsers, FiClock, FiEdit2, FiLayers, FiZap, FiUser, FiCalendar,
  FiTrendingUp, FiStar, FiLock,
} from 'react-icons/fi';
import { getProgramById, getProgramResources, enrollInProgram, getMyPrograms } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const RES_CFG = {
  course:      { label: 'Courses',      icon: FiBookOpen,  color: 'blue',    bg: 'blue.50',    iconBg: 'blue.500' },
  quiz:        { label: 'Quizzes',      icon: FiClipboard, color: 'purple',  bg: 'purple.50',  iconBg: 'purple.500' },
  clinical_case: { label: 'Cases',      icon: FiHeart,     color: 'pink',    bg: 'pink.50',    iconBg: 'pink.500' },
  flashcard:   { label: 'Flashcards',   icon: FiZap,       color: 'orange',  bg: 'orange.50',  iconBg: 'orange.500' },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 22 } },
};

const ProgramDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const [program, setProgram] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [animateIn, setAnimateIn] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [progRes, resRes] = await Promise.all([getProgramById(id), getProgramResources(id)]);
        setProgram(progRes.data.program);
        setResources(resRes.data.programResources || []);

        if (isAuthenticated) {
          try {
            const { data } = await getMyPrograms();
            setEnrolledIds((data.programs || []).map(p => p._id));
          } catch (e) {}
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load program');
      } finally { setLoading(false); setTimeout(() => setAnimateIn(true), 50); }
    };
    fetchAll();
  }, [id, isAuthenticated]);

  const handleEnroll = async () => {
    if (!isAuthenticated) { toast({ title: 'Please login to enroll', status: 'warning', duration: 3000 }); navigate('/login'); return; }
    const ownerId = program.owner?._id || (typeof program.owner === 'object' ? program.owner._id : program.owner);
    const currentUserId = user?.id || user?._id;
    if (ownerId && currentUserId && (ownerId.toString() === currentUserId.toString() || (program.createdBy && program.createdBy.toString() === currentUserId.toString()))) {
      toast({ title: 'Cannot enroll', description: 'You created this program', status: 'warning', duration: 4000 }); return;
    }
    setEnrolling(true);
    try {
      await enrollInProgram(id);
      toast({ title: 'Enrolled!', status: 'success', duration: 3000 });
      navigate(`/my-program/${id}`);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already enrolled')) navigate(`/my-program/${id}`);
      else toast({ title: 'Enrollment failed', description: msg, status: 'error', duration: 5000 });
    } finally { setEnrolling(false); }
  };

  if (loading) return <Box minH="100vh" display="flex" alignItems="center" justifyContent="center"><Spinner size="xl" thickness="3px" color="purple.500" /></Box>;
  if (error || !program) return <Container py={20}><Alert status="error" borderRadius="xl" variant="left-accent"><AlertIcon /> {error || 'Not found'}</Alert></Container>;

  const isExpired = program.expiresAt && new Date(program.expiresAt) < new Date();
  const isFull = program.maxUsers && program.currentUsers >= program.maxUsers;
  const isAvailable = program.active && !isExpired && !isFull;
  const ownerId = program.owner?._id || (typeof program.owner === 'object' ? program.owner._id : program.owner);
  const currentUserId = user?.id || user?._id;
  const isEnrolled = enrolledIds.includes(id);
  const isOwner = user?.role === 'educator' && ownerId && currentUserId && (
    ownerId.toString() === currentUserId.toString() || (program.createdBy && program.createdBy.toString() === currentUserId.toString())
  );
  const totalItems = resources.length;

  const counts = {};
  resources.forEach(r => { counts[r.resourceType] = (counts[r.resourceType] || 0) + 1; });

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')} py={10}>
      <Container maxW="900px">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={animateIn ? { opacity: 1, x: 0 } : {}}>
          <Button onClick={() => navigate('/programs')} variant="ghost" size="sm" leftIcon={<FiArrowLeft />} mb={6} colorScheme="purple">
            Back to Programs
          </Button>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
          {/* Hero Card */}
          <motion.div variants={fadeUp}>
            <Card bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)" color="white" borderRadius="2xl" mb={6} overflow="hidden" position="relative">
              <Box position="absolute" top="-30px" right="-20px" w="140px" h="140px" borderRadius="full" bg="whiteAlpha.10" pointerEvents="none" />
              <Box position="absolute" bottom="-25px" left="-15px" w="100px" h="100px" borderRadius="full" bg="whiteAlpha.50" pointerEvents="none" />
              <CardBody p={6} position="relative" zIndex={1}>
                <Flex wrap="wrap" gap={1.5} mb={2}>
                  <Badge bg="whiteAlpha.300" color="white" textTransform="capitalize" borderRadius="full" px={3}>{program.programType?.replace(/_/g, ' ')}</Badge>
                  {program.freeAccess && <Badge bg="green.400" borderRadius="full" px={3}>Free</Badge>}
                  {program.discountPercentage > 0 && <Badge bg="orange.400" borderRadius="full" px={3}>{program.discountPercentage}% off</Badge>}
                </Flex>
                <Heading size="xl" mb={1}>{program.title}</Heading>
                <Text opacity={0.85} fontSize="sm" mb={4}>{program.description}</Text>
                <Flex wrap="wrap" gap={4} fontSize="xs" opacity={0.8}>
                  {program.owner?.username && <HStack spacing={1.5}><FiUser size={13} /><Text>by {program.owner.username}</Text></HStack>}
                  <HStack spacing={1.5}><FiUsers size={13} /><Text>{program.currentUsers || 0}{program.maxUsers && `/${program.maxUsers}`} enrolled</Text></HStack>
                  <HStack spacing={1.5}><FiCalendar size={13} /><Text>Created {new Date(program.createdAt).toLocaleDateString()}</Text></HStack>
                  {program.expiresAt && <HStack spacing={1.5}><FiClock size={13} /><Text>Expires {new Date(program.expiresAt).toLocaleDateString()}</Text></HStack>}
                </Flex>
              </CardBody>
            </Card>
          </motion.div>

          {/* 2-Column Grid */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            {/* Left: Resources */}
            <motion.div variants={fadeUp}>
              <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} h="full">
                <CardBody p={5}>
                  <Flex align="center" gap={2} mb={4}>
                    <Box bg="purple.500" p={1.5} borderRadius="md"><FiLayers size={14} color="white" /></Box>
                    <Text fontSize="sm" fontWeight="semibold">Program Resources</Text>
                    <Badge colorScheme="purple" borderRadius="full" variant="subtle" ml="auto">{totalItems}</Badge>
                  </Flex>

                  {totalItems === 0 ? (
                    <Text fontSize="sm" color={mutedColor} fontStyle="italic" textAlign="center" py={6}>No resources assigned yet</Text>
                  ) : (
                    <VStack align="stretch" spacing={3}>
                      {Object.entries(RES_CFG).map(([type, cfg]) => {
                        const items = resources.filter(r => r.resourceType === type);
                        if (items.length === 0) return null;
                        return (
                          <Box key={type}>
                            <Flex align="center" gap={2} mb={1.5}>
                              <Box bg={cfg.iconBg} p={1} borderRadius="md"><Icon as={cfg.icon} boxSize={3} color="white" /></Box>
                              <Text fontSize="xs" fontWeight="semibold" color={mutedColor}>{cfg.label}</Text>
                              <Badge colorScheme={cfg.color} borderRadius="full" fontSize="2xs" ml="auto">{items.length}</Badge>
                            </Flex>
                            <VStack align="stretch" spacing={1} pl={7}>
                              {items.map((res) => (
                                <Flex key={res._id} align="center" gap={2} py={1} px={2} borderRadius="md" bg={useColorModeValue(`${cfg.color}.50`, `${cfg.color}.900`)}>
                                  <Icon as={cfg.icon} boxSize={3} color={`${cfg.color}.500`} />
                                  <Text fontSize="sm" noOfLines={1}>{res.resourceId?.title || 'Untitled'}</Text>
                                </Flex>
                              ))}
                            </VStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}

                  <Divider my={4} />
                  <Flex justify="space-between" fontSize="sm">
                    <Text color={mutedColor}>Code</Text>
                    <Text fontFamily="mono" fontWeight="semibold" fontSize="xs">{program.code}</Text>
                  </Flex>
                </CardBody>
              </Card>
            </motion.div>

            {/* Right: Stats + Enroll */}
            <motion.div variants={fadeUp}>
              <VStack spacing={4}>
                {/* Quick stats */}
                <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} w="full">
                  <CardBody p={4}>
                    <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={3} textTransform="uppercase" letterSpacing="wide">Quick Stats</Text>
                    <SimpleGrid columns={2} spacing={3}>
                      <Box textAlign="center" p={3} bg="purple.50" borderRadius="lg">
                        <Text fontSize="2xl" fontWeight="bold" color="purple.600">{totalItems}</Text>
                        <Text fontSize="xs" color="purple.500">Resources</Text>
                      </Box>
                      <Box textAlign="center" p={3} bg="green.50" borderRadius="lg">
                        <Text fontSize="2xl" fontWeight="bold" color="green.600">{program.currentUsers || 0}</Text>
                        <Text fontSize="xs" color="green.500">Enrolled</Text>
                      </Box>
                      {Object.entries(counts).slice(0, 4).map(([type, count]) => {
                        const cfg = RES_CFG[type];
                        if (!cfg) return null;
                        return (
                          <Box key={type} textAlign="center" p={2.5} bg={`${cfg.color}.50`} borderRadius="lg">
                            <Icon as={cfg.icon} boxSize={4} color={`${cfg.color}.500`} mb={0.5} />
                            <Text fontSize="lg" fontWeight="bold" color={`${cfg.color}.600`}>{count}</Text>
                            <Text fontSize="xs" color={`${cfg.color}.500`}>{cfg.label.replace('s', '')}</Text>
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Action card */}
                <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={isEnrolled ? 'green.200' : isOwner ? 'teal.200' : borderColor} w="full" overflow="hidden">
                  <Box h="3px" bg={isEnrolled ? 'green.500' : isOwner ? 'teal.500' : isAvailable ? 'purple.500' : 'orange.500'} />
                  <CardBody p={5} textAlign="center">
                    {isEnrolled ? (
                      <>
                        <Box bg="green.50" p={3} borderRadius="full" display="inline-block" mb={3}>
                          <FiStar size={20} color={useColorModeValue('#38A169', '#48BB78')} />
                        </Box>
                        <Heading size="sm" mb={1} color="green.600">Already Enrolled</Heading>
                        <Text fontSize="sm" color={mutedColor} mb={4}>You have access to all resources</Text>
                        <Button colorScheme="green" w="full" onClick={() => navigate(`/my-program/${id}`)}>Open Dashboard</Button>
                      </>
                    ) : isOwner ? (
                      <>
                        <Box bg="teal.50" p={3} borderRadius="full" display="inline-block" mb={3}>
                          <FiEdit2 size={20} color={useColorModeValue('#319795', '#38B2AC')} />
                        </Box>
                        <Heading size="sm" mb={1}>You Created This Program</Heading>
                        <Text fontSize="sm" color={mutedColor} mb={4}>Manage resources, students, and settings</Text>
                        <Button colorScheme="teal" w="full" onClick={() => navigate(`/educator/programs/${id}`)}>Manage Program</Button>
                      </>
                    ) : isAvailable ? (
                      <>
                        <Box bg="purple.50" p={3} borderRadius="full" display="inline-block" mb={3}>
                          <FiStar size={20} color={useColorModeValue('#805AD5', '#9F7AEA')} />
                        </Box>
                        <Heading size="sm" mb={1}>Ready to Start?</Heading>
                        <Text fontSize="sm" color={mutedColor} mb={4}>
                          {totalItems > 0
                            ? `Access ${totalItems} resource${totalItems !== 1 ? 's' : ''} across ${Object.keys(counts).length} categor${Object.keys(counts).length !== 1 ? 'ies' : 'y'}`
                            : 'Enroll to get access'}
                        </Text>
                        <Button colorScheme="purple" w="full" size="lg" onClick={handleEnroll} isLoading={enrolling} loadingText="Enrolling..." rightIcon={<FiTrendingUp />}>Enroll Now</Button>
                      </>
                    ) : (
                      <>
                        <Box bg="orange.50" p={3} borderRadius="full" display="inline-block" mb={3}>
                          <FiLock size={20} color={useColorModeValue('#DD6B20', '#ED8936')} />
                        </Box>
                        <Heading size="sm" mb={1}>Not Available</Heading>
                        <Text fontSize="sm" color={mutedColor}>{isExpired ? 'This program has expired' : isFull ? 'This program is full' : 'This program is currently inactive'}</Text>
                      </>
                    )}
                  </CardBody>
                </Card>
              </VStack>
            </motion.div>
          </SimpleGrid>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ProgramDetailPage;
