import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, Card, CardBody, SimpleGrid,
  useToast, HStack, VStack, Progress, Tooltip, Circle,
  Collapse,
} from '@chakra-ui/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAward, FiArrowLeft, FiBookOpen, FiClipboard, FiHeart,
  FiCheckCircle, FiPlay, FiBarChart, FiClock, FiZap,
  FiChevronDown, FiChevronRight, FiStar, FiTrendingUp,
  FiTarget, FiFlag, FiLayers, FiCalendar, FiCheckSquare,
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid } from 'recharts';
import { getProgramById, getProgramResources, getMyCompletedQuizzes, getMyActivityLogs } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// ── Motion Variants ──────────────────────────────────────────
const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
};
const cardVariant = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 180, damping: 20 } },
};

// ── Animated progress ring ────────────────────────────────────
const MotionCircle = motion(Circle);
const AnimatedProgressRing = ({ value, size = 120, strokeWidth = 10, color = 'teal.500', trackColor = 'gray.200' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
      <Circle size={`${size}px`} bg="transparent">
        <svg width={size} height={size}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={useColorModeValue('#E2E8F0', '#2D3748')}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={useColorModeValue(
              color === 'teal.500' ? '#319795' : color === 'purple.500' ? '#805AD5' : '#D53F8C',
              color === 'teal.500' ? '#38B2AC' : color === 'purple.500' ? '#9F7AEA' : '#F687B3'
            )}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </Circle>
      <Box position="absolute" textAlign="center">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
        >
          <Text fontSize="2xl" fontWeight="extrabold" lineHeight="1">{Math.round(value)}%</Text>
          <Text fontSize="xs" color="gray.500">complete</Text>
        </motion.div>
      </Box>
    </Box>
  );
};

// ── Resource config ───────────────────────────────────────────
const RES_CFG = {
  course:      { label: 'Course',      icon: FiBookOpen,   color: 'blue',   bgGrad: 'linear(135deg, #3182CE, #2B6CB0)' },
  quiz:        { label: 'Quiz',        icon: FiClipboard,  color: 'purple', bgGrad: 'linear(135deg, #805AD5, #6B46C1)' },
  clinical_case: { label: 'Clinical Case', icon: FiHeart,  color: 'pink',   bgGrad: 'linear(135deg, #D53F8C, #B83280)' },
  flashcard:   { label: 'Flashcard',   icon: FiZap,        color: 'orange', bgGrad: 'linear(135deg, #DD6B20, #C05621)' },
};

// ── Category label ───────────────────────────────────────────
const categoryCounts = (resources) => ({
  course: resources.filter(r => r.resourceType === 'course').length,
  quiz: resources.filter(r => r.resourceType === 'quiz').length,
  clinical_case: resources.filter(r => r.resourceType === 'clinical_case').length,
  flashcard: resources.filter(r => r.resourceType === 'flashcard').length,
});

// ── Empty illustration ────────────────────────────────────────
const EmptyIllustration = () => (
  <Box textAlign="center" py={10}>
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 12 }}
    >
      <Box
        bg="gray.100" borderRadius="full" p={6} display="inline-block"
        _dark={{ bg: 'gray.700' }}
      >
        <Icon as={FiAward} boxSize={12} color="gray.400" _dark={{ color: 'gray.500' }} />
      </Box>
    </motion.div>
    <Heading size="md" mt={4} mb={1}>No resources assigned yet</Heading>
    <Text fontSize="sm" color="gray.500" maxW="400px" mx="auto">
      This program doesn't have any content yet. Check back later when the educator adds resources.
    </Text>
  </Box>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const ProgramDashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, user } = useAuth();
  const [program, setProgram] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedQuizIds, setCompletedQuizIds] = useState([]);
  const [quizStatusMap, setQuizStatusMap] = useState({});
  const [expandedSection, setExpandedSection] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [progRes, resRes] = await Promise.all([
          getProgramById(id),
          getProgramResources(id),
        ]);

        if (!progRes.data.program) {
          setError('Program not found');
          return;
        }

        setProgram(progRes.data.program);
        setResources(resRes.data.programResources || []);

        if (isAuthenticated) {
          try {
            const compRes = await getMyCompletedQuizzes();
            setCompletedQuizIds((compRes.data.completedQuizIds || []).map(q => q.toString()));
          } catch (e) { /* silent */ }
          try {
            const logRes = await getMyActivityLogs({ resourceType: 'Quiz', action: 'quiz_completed', limit: 200 });
            if (logRes?.data?.activityLogs) {
              const statuses = {};
              logRes.data.activityLogs.forEach((log) => {
                const qId = log.resourceId?.toString();
                if (!qId || statuses[qId] !== undefined) return;
                const rawPassed = log.metadata?.passed;
                const scoreValue = log.metadata?.score;
                const parsedScore = typeof scoreValue === 'number' ? scoreValue : Number(scoreValue);
                statuses[qId] = { passed: rawPassed === true || rawPassed === 'true', score: Number.isFinite(parsedScore) ? parsedScore : undefined };
              });
              setQuizStatusMap(statuses);
            }
          } catch (e) { /* silent */ }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load program');
      } finally {
        setLoading(false);
        setTimeout(() => setAnimateIn(true), 100);
      }
    };
    fetchData();
  }, [id, isAuthenticated]);

  const getResourceLink = (res) => {
    if (res.resourceType === 'course') return `/courses/${res.resourceId?._id}`;
    if (res.resourceType === 'quiz') return `/quizzes/${res.resourceId?._id}`;
    if (res.resourceType === 'clinical_case') return `/clinical-cases/${res.resourceId?._id}`;
    if (res.resourceType === 'flashcard') return `/flashcard/${res.resourceId?._id}`;
    return '#';
  };

  // ── Derived data ──────────────────────────────────────────
  const counts = useMemo(() => categoryCounts(resources), [resources]);
  const totalItems = resources.length;
  const passedQuizzesInProgram = resources
    .filter(r => r.resourceType === 'quiz')
    .filter(r => quizStatusMap[r.resourceId?._id]?.passed === true);
  const failedQuizzesInProgram = resources
    .filter(r => r.resourceType === 'quiz')
    .filter(r => quizStatusMap[r.resourceId?._id]?.passed === false);
  const attemptedQuizIds = new Set([...Object.keys(quizStatusMap)]);
  const completedCount = passedQuizzesInProgram.length + failedQuizzesInProgram.length;
  const totalQuizzes = counts.quiz;
  const progressPct = totalQuizzes > 0 ? Math.round((completedCount / totalQuizzes) * 100) : 0;

  // Group resources by type for sections
  const grouped = useMemo(() => {
    const g = {};
    const order = ['course', 'quiz', 'clinical_case', 'flashcard'];
    for (const type of order) {
      const items = resources.filter(r => r.resourceType === type);
      if (items.length > 0) g[type] = items;
    }
    return g;
  }, [resources]);

  // Next uncompleted quiz (for "continue where you left off")
  const nextQuiz = useMemo(() => {
    return resources
      .filter(r => r.resourceType === 'quiz')
      .find(r => !completedQuizIds.includes(r.resourceId?._id));
  }, [resources, completedQuizIds]);

  // ── Pie chart data ────────────────────────────────────────
  const pieData = useMemo(() => {
    const data = [];
    for (const [type, items] of Object.entries(grouped)) {
      const cfg = RES_CFG[type];
      const done = type === 'quiz'
        ? items.filter(r => completedQuizIds.includes(r.resourceId?._id)).length
        : 0;
      const left = items.length - done;
      if (done > 0) data.push({ name: `${cfg.label} Done`, value: done, color: `${cfg.color}.500` });
      if (left > 0) data.push({ name: `${cfg.label} Left`, value: left, color: `${cfg.color}.200` });
    }
    // If nothing, show placeholder
    if (data.length === 0 && totalItems > 0) {
      for (const [type, items] of Object.entries(grouped)) {
        data.push({ name: RES_CFG[type].label, value: items.length, color: `${RES_CFG[type].color}.200` });
      }
    }
    return data;
  }, [grouped, completedQuizIds, totalItems]);

  const CHART_COLORS = {
    'blue.500': '#3182CE', 'blue.200': '#90CDF4',
    'purple.500': '#805AD5', 'purple.200': '#D6BCFA',
    'pink.500': '#D53F8C', 'pink.200': '#FBB6CE',
    'orange.500': '#DD6B20', 'orange.200': '#FBD38D',
  };

  // Toggle section expand
  const toggleSection = (type) => {
    setExpandedSection(prev => prev === type ? null : type);
  };

  // ── Loading / Error ────────────────────────────────────────
  if (loading) {
    return (
      <Box minH="100vh" bg={sectionBg} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="3px" color="teal.500" />
          <Text fontSize="sm" color={mutedColor}>Loading your program...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Container py={20}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert status="error" borderRadius="xl" variant="left-accent">
            <AlertIcon /> {error}
          </Alert>
          <Button as={Link} to="/programs" leftIcon={<FiArrowLeft />} variant="ghost" mt={4} size="sm">
            Browse Programs
          </Button>
        </motion.div>
      </Container>
    );
  }

  if (!program) {
    return (
      <Container py={20}>
        <Alert status="info" borderRadius="xl"><AlertIcon /> Program not found</Alert>
      </Container>
    );
  }

  const hasContent = totalItems > 0;

  return (
    <Box minH="100vh" bg={sectionBg}>
      {/* ════════════════════════════════════════════════════════ */}
      {/* HERO — Animated progress ring + program summary         */}
      {/* ════════════════════════════════════════════════════════ */}
      <Box
        bgGradient="linear(135deg, #319795 0%, #285E61 50%, #234E52 100%)"
        color="white"
        position="relative"
        overflow="hidden"
      >
        {/* Decorative background blobs */}
        <Box
          position="absolute" top="-60px" right="-60px"
          w="250px" h="250px" borderRadius="full"
          bg="whiteAlpha.100" pointerEvents="none"
        />
        <Box
          position="absolute" bottom="-40px" left="-40px"
          w="180px" h="180px" borderRadius="full"
          bg="whiteAlpha.50" pointerEvents="none"
        />
        <Box
          position="absolute" top="40px" left="30%"
          w="80px" h="80px" borderRadius="full"
          bg="whiteAlpha.50" pointerEvents="none"
        />

        <Container maxW="1200px" position="relative" zIndex={1}>
          {/* Top bar */}
          <Flex justify="space-between" align="center" pt={4} pb={2}>
            <HStack spacing={2}>
              <Button
                as={Link} to="/programs"
                variant="ghost" colorScheme="whiteAlpha"
                size="xs" leftIcon={<FiArrowLeft />}
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                Programs
              </Button>
            </HStack>
            <Badge
              bg="whiteAlpha.200" color="white"
              borderRadius="full" px={3} py={1}
              fontSize="xs" textTransform="capitalize"
            >
              {program.programType?.replace(/_/g, ' ')}
            </Badge>
          </Flex>

          {/* Hero body */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align="center"
            gap={{ base: 6, md: 10 }}
            py={{ base: 6, md: 10 }}
          >
            {/* Left: Program info */}
            <Box flex="1">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={animateIn ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <Heading size="2xl" mb={2} lineHeight="1.2">
                  {program.title}
                </Heading>
                <Text opacity={0.85} fontSize="md" maxW="600px" mb={4}>
                  {program.description}
                </Text>
                <Flex wrap="wrap" gap={4} fontSize="sm" opacity={0.8}>
                  <HStack spacing={1.5}>
                    <FiLayers size={14} />
                    <Text>{totalItems} resource{totalItems !== 1 && 's'}</Text>
                  </HStack>
                  <HStack spacing={1.5}>
                    <FiBookOpen size={14} />
                    <Text>{counts.course} course{counts.course !== 1 && 's'}</Text>
                  </HStack>
                  <HStack spacing={1.5}>
                    <FiClipboard size={14} />
                    <Text>{counts.quiz} quiz{counts.quiz !== 1 && 'zes'}</Text>
                  </HStack>
                  <HStack spacing={1.5}>
                    <FiHeart size={14} />
                    <Text>{counts.clinical_case} case{counts.clinical_case !== 1 && 's'}</Text>
                  </HStack>
                  {counts.flashcard > 0 && (
                    <HStack spacing={1.5}>
                      <FiZap size={14} />
                      <Text>{counts.flashcard} flashcard{counts.flashcard !== 1 && 's'}</Text>
                    </HStack>
                  )}
                </Flex>
              </motion.div>
            </Box>

            {/* Right: Progress ring */}
            {hasContent && (
              <Box textAlign="center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={animateIn ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                >
                  <AnimatedProgressRing
                    value={progressPct}
                    size={130}
                    strokeWidth={12}
                    color={progressPct === 100 ? 'teal.500' : 'teal.500'}
                  />
                </motion.div>
                {nextQuiz ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={animateIn ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      size="sm"
                      colorScheme="whiteAlpha"
                      variant="outline"
                      leftIcon={<FiPlay />}
                      mt={3}
                      _hover={{ bg: 'whiteAlpha.200' }}
                      onClick={() => {
                        const link = getResourceLink(nextQuiz);
                        if (link !== '#') navigate(link);
                      }}
                    >
                      Continue Learning
                    </Button>
                  </motion.div>
                ) : totalQuizzes > 0 && progressPct === 100 ? (
                  <motion.div initial={{ opacity: 0 }} animate={animateIn ? { opacity: 1 } : {}} transition={{ delay: 0.8 }}>
                    <HStack spacing={1} justify="center" mt={3}>
                      <Icon as={FiStar} color="yellow.300" />
                      <Text fontSize="sm" fontWeight="bold" color="yellow.200">All quizzes completed!</Text>
                      <Icon as={FiStar} color="yellow.300" />
                    </HStack>
                  </motion.div>
                ) : null}
              </Box>
            )}
          </Flex>
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════ */}
      {/* CONTENT                                                */}
      {/* ════════════════════════════════════════════════════════ */}
      <Container maxW="1200px" py={6}>
        {!hasContent ? (
          <motion.div variants={containerVariant} initial="hidden" animate="visible">
            <Card bg={cardBg} borderRadius="2xl" borderWidth="1px" borderColor={borderColor}>
              <CardBody>
                <EmptyIllustration />
              </CardBody>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={containerVariant} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
              {/* ─── Left: Resource sections ──────────────────── */}
              <Box gridColumn={{ base: 1, lg: 'span 2' }}>
                {/* Progress overview bar */}
                <motion.div variants={itemVariant}>
                  <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} mb={5}>
                    <CardBody>
                      <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={4}>
                        <Box flex="1" w="full">
                          <Flex justify="space-between" mb={1}>
                            <Text fontSize="sm" fontWeight="medium">Program Progress</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              <Text as="span" color="green.500">{passedQuizzesInProgram.length} passed</Text>
                              {failedQuizzesInProgram.length > 0 && <><Text as="span" color="gray.400"> · </Text><Text as="span" color="red.500">{failedQuizzesInProgram.length} failed</Text></>}
                              <Text as="span" color="gray.400"> · </Text>
                              <Text as="span" color="teal.500">{completedCount}/{totalQuizzes}</Text>
                            </Text>
                          </Flex>
                          <Progress
                            value={progressPct}
                            size="lg"
                            colorScheme="teal"
                            borderRadius="full"
                            bg={useColorModeValue('gray.100', 'gray.700')}
                            hasStripe
                            isAnimated={progressPct < 100}
                          />
                          <Text fontSize="xs" color={mutedColor} mt={1}>
                            {totalQuizzes === 0
                              ? 'No quizzes to complete'
                              : progressPct === 100
                                ? '🎉 All quizzes completed! Great work!'
                                : failedQuizzesInProgram.length > 0
                                  ? `${completedCount} of ${totalQuizzes} attempted — ${passedQuizzesInProgram.length} passed, ${failedQuizzesInProgram.length} need review`
                                  : `You've completed ${completedCount} of ${totalQuizzes} quizzes`}
                          </Text>
                        </Box>
                      </Flex>
                    </CardBody>
                  </Card>
                </motion.div>

                {/* Resource sections */}
                {Object.entries(grouped).map(([type, items]) => {
                  const cfg = RES_CFG[type];
                  const doneCount = type === 'quiz'
                    ? items.filter(r => quizStatusMap[r.resourceId?._id]?.passed === true || quizStatusMap[r.resourceId?._id]?.passed === false).length
                    : 0;
                  const isExpanded = expandedSection === type;
                  const sectionComplete = type === 'quiz' && doneCount === items.length;

                  return (
                    <motion.div key={type} variants={itemVariant}>
                      <Card
                        bg={cardBg}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor={sectionComplete ? 'green.200' : borderColor}
                        mb={4}
                        overflow="hidden"
                        cursor="pointer"
                        onClick={() => toggleSection(type)}
                        _hover={{ borderColor: sectionComplete ? 'green.300' : `${cfg.color}.300` }}
                        transition="all 0.2s"
                      >
                        {/* Section header */}
                        <Flex
                          p={4}
                          align="center"
                          gap={3}
                          bg={sectionComplete ? useColorModeValue('green.50', 'green.900') : 'transparent'}
                        >
                          <Box
                            bg={`${cfg.color}.500`}
                            p={2.5}
                            borderRadius="lg"
                            flexShrink={0}
                          >
                            <Icon as={cfg.icon} boxSize={4} color="white" />
                          </Box>
                          <Box flex="1">
                            <Heading size="sm" mb={0}>
                              {cfg.label}s
                              {sectionComplete && (
                                <Icon as={FiCheckCircle} color="green.500" ml={2} boxSize={4} />
                              )}
                            </Heading>
                            <Text fontSize="xs" color={mutedColor}>
                              {items.length} item{items.length !== 1 && 's'}
                              {type === 'quiz' && ` · ${doneCount}/${items.length} ${doneCount === 1 ? 'attempted' : 'attempted'}`}
                            </Text>
                          </Box>
                          <Icon
                            as={isExpanded ? FiChevronDown : FiChevronRight}
                            boxSize={5}
                            color={mutedColor}
                            transition="transform 0.2s"
                          />
                        </Flex>

                        {/* Section items */}
                        <Collapse in={isExpanded} animateOpacity>
                          <Box borderTopWidth="1px" borderColor={borderColor} px={1} py={1}>
                            <AnimatePresence>
                              {items.map((res, idx) => {
                                const isQuiz = type === 'quiz';
                                const quizStatus = quizStatusMap[res.resourceId?._id];
                                const completed = isQuiz && (quizStatus?.passed === true || quizStatus?.passed === false);
                                const passed = quizStatus?.passed === true;
                                const link = getResourceLink(res);

                                return (
                                  <motion.div
                                    key={res._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                  >
                                    <Link to={link} style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                                      <Flex
                                        p={3}
                                        mx={1}
                                        borderRadius="lg"
                                        align="center"
                                        gap={3}
                                        _hover={{ bg: useColorModeValue(`${cfg.color}.50`, `${cfg.color}.900`) }}
                                        transition="background 0.15s"
                                      >
                                        {/* Step number */}
                                        <Flex
                                          w={7} h={7}
                                          borderRadius="full"
                                          bg={completed ? 'green.500' : useColorModeValue('gray.100', 'gray.700')}
                                          color={completed ? 'white' : mutedColor}
                                          align="center"
                                          justify="center"
                                          flexShrink={0}
                                          fontSize="xs"
                                          fontWeight="bold"
                                        >
                                          {completed ? <FiCheckCircle size={14} /> : idx + 1}
                                        </Flex>

                                        {/* Info */}
                                        <Box flex="1" minW={0}>
                                          <Text
                                            fontSize="sm"
                                            fontWeight="medium"
                                            noOfLines={1}
                                            color={completed ? (passed ? 'green.600' : 'red.600') : 'inherit'}
                                          >
                                            {res.resourceId?.title || `Untitled ${cfg.label}`}
                                          </Text>
                                          {completed && (
                                            <Text fontSize="xs" color={passed ? 'green.500' : 'red.500'}>
                                              {passed ? '✓ Passed' : '✗ Failed'}{quizStatus?.score !== undefined ? ` (${Math.round(quizStatus.score)}%)` : ''}
                                            </Text>
                                          )}
                                        </Box>

                                        {/* Badge + arrow */}
                                        <HStack spacing={2}>
                                          {isQuiz && (
                                            <Badge
                                              colorScheme={completed ? (passed ? 'green' : 'red') : cfg.color}
                                              borderRadius="full"
                                              variant={completed ? 'solid' : 'subtle'}
                                              fontSize="2xs"
                                            >
                                              {completed ? (passed ? 'Passed' : 'Failed') : 'Pending'}
                                            </Badge>
                                          )}
                                          <Icon
                                            as={FiChevronRight}
                                            boxSize={4}
                                            color={completed ? 'green.400' : 'gray.300'}
                                          />
                                        </HStack>
                                      </Flex>
                                    </Link>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </Box>
                        </Collapse>
                      </Card>
                    </motion.div>
                  );
                })}
              </Box>

              {/* ─── Right: Stats sidebar ─────────────────────── */}
              <Box>
                <motion.div variants={cardVariant}>
                  {/* Completion pie chart */}
                  <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} mb={4}>
                    <CardBody>
                      <Flex align="center" gap={2} mb={3}>
                        <Icon as={FiBarChart} color="teal.500" />
                        <Text fontSize="sm" fontWeight="semibold">Resource Breakdown</Text>
                      </Flex>
                      {pieData.length > 0 ? (
                        <Box h="180px">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%" cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {pieData.map((entry, i) => (
                                  <Cell key={i} fill={CHART_COLORS[entry.color] || '#A0AEC0'} />
                                ))}
                              </Pie>
                              <ReTooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                                formatter={(value, name) => [value, name]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      ) : (
                        <Text fontSize="sm" color={mutedColor} textAlign="center" py={4}>
                          No resources to display
                        </Text>
                      )}

                      {/* Legend */}
                      <VStack align="stretch" spacing={1.5} mt={2}>
                        {Object.entries(grouped).map(([type, items]) => {
                          const cfg = RES_CFG[type];
                          const done = type === 'quiz'
                            ? items.filter(r => completedQuizIds.includes(r.resourceId?._id)).length
                            : 0;
                          return (
                            <Flex key={type} align="center" gap={2} fontSize="xs">
                              <Box
                                w={3} h={3} borderRadius="sm"
                                bg={`${cfg.color}.500`}
                                flexShrink={0}
                              />
                              <Text flex="1">{cfg.label}s</Text>
                              <Text fontWeight="semibold">{items.length}</Text>
                              {type === 'quiz' && (
                                <Text color="green.500" fontWeight="bold">{done}</Text>
                              )}
                            </Flex>
                          );
                        })}
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Program info card */}
                  <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} mb={4}>
                    <CardBody>
                      <Flex align="center" gap={2} mb={3}>
                        <Icon as={FiTarget} color="teal.500" />
                        <Text fontSize="sm" fontWeight="semibold">Program Info</Text>
                      </Flex>
                      <VStack align="stretch" spacing={3}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color={mutedColor}>Code</Text>
                          <Text fontWeight="semibold" fontFamily="mono">{program.code}</Text>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color={mutedColor}>Type</Text>
                          <Badge textTransform="capitalize" variant="subtle">
                            {program.programType?.replace(/_/g, ' ')}
                          </Badge>
                        </Flex>
                        {program.expiresAt && (
                          <Flex justify="space-between" fontSize="sm">
                            <Text color={mutedColor}>Expires</Text>
                            <Text>{new Date(program.expiresAt).toLocaleDateString()}</Text>
                          </Flex>
                        )}
                        <Flex justify="space-between" fontSize="sm">
                          <Text color={mutedColor}>Enrolled</Text>
                          <Text fontWeight="semibold">{program.currentUsers || 0}{program.maxUsers && `/${program.maxUsers}`}</Text>
                        </Flex>
                        {totalQuizzes > 0 && (
                          <Flex justify="space-between" fontSize="sm">
                            <Text color={mutedColor}>Passed</Text>
                            <Text fontWeight="semibold" color="green.500">{passedQuizzesInProgram.length}/{totalQuizzes}</Text>
                          </Flex>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Motivational / Tips card */}
                  <Card
                    bgGradient="linear(135deg, #319795, #285E61)"
                    color="white"
                    borderRadius="xl"
                    border="none"
                  >
                    <CardBody textAlign="center">
                      {progressPct === 100 && totalQuizzes > 0 ? (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                          >
                            <Icon as={FiAward} boxSize={10} mb={2} />
                          </motion.div>
                          <Heading size="sm" mb={1}>Program Complete! 🎉</Heading>
                          <Text fontSize="xs" opacity={0.85}>
                            You aced all the quizzes in this program. Fantastic work!
                          </Text>
                        </>
                      ) : nextQuiz ? (
                        <>
                          <Icon as={FiFlag} boxSize={8} mb={2} />
                          <Heading size="sm" mb={1}>Keep Going!</Heading>
                          <Text fontSize="xs" opacity={0.85}>
                            Your next quiz "{nextQuiz.resourceId?.title || 'Untitled'}" is waiting.
                            Each step builds your knowledge.
                          </Text>
                          <Button
                            size="xs" colorScheme="whiteAlpha" variant="solid"
                            mt={3} leftIcon={<FiPlay />}
                            onClick={() => {
                              const link = getResourceLink(nextQuiz);
                              if (link !== '#') navigate(link);
                            }}
                          >
                            Take it now
                          </Button>
                        </>
                      ) : totalQuizzes === 0 ? (
                        <>
                          <Icon as={FiBookOpen} boxSize={8} mb={2} />
                          <Heading size="sm" mb={1}>Explore the Resources</Heading>
                          <Text fontSize="xs" opacity={0.85}>
                            Browse through the courses, cases, and flashcards in this program.
                          </Text>
                        </>
                      ) : (
                        <>
                          <Icon as={FiStar} boxSize={8} mb={2} />
                          <Heading size="sm" mb={1}>All Done! 🎉</Heading>
                          <Text fontSize="xs" opacity={0.85}>
                            You've completed all available quizzes. Check out other programs!
                          </Text>
                        </>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              </Box>
            </SimpleGrid>
          </motion.div>
        )}
      </Container>
    </Box>
  );
};

export default ProgramDashboardPage;
