import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, Radio, RadioGroup, Stack,
  Progress, HStack, useToast, Divider, Card, CardBody, VStack, Center, Tooltip,
} from '@chakra-ui/react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiClipboard, FiClock, FiArrowLeft, FiArrowRight, FiCheckCircle, FiSend,
  FiAlertCircle, FiZap, FiTarget, FiFlag, FiHelpCircle, FiCheckSquare,
} from 'react-icons/fi';
import { getQuizById, submitQuiz } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const questionVariant = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 250, damping: 25 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.15 } },
};

const QuizTakePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [direction, setDirection] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const { data } = await getQuizById(id);
        setQuiz(data.quiz);
        if (data.quiz.timeLimit) setTimeLeft(data.quiz.timeLimit * 60);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && quiz && !submitting) {
      toast({ title: "Time's up!", description: 'Auto-submitting your answers...', status: 'warning', duration: 3000 });
      handleSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const questions = quiz?.questions || [];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQ && totalQ > 0;
  const progress = (answeredCount / totalQ) * 100;

  const handleAnswer = (value) => {
    setAnswers(prev => ({ ...prev, [currentQ]: value }));
  };

  const goToNext = () => {
    if (currentQ < totalQ - 1) { setDirection(1); setCurrentQ(currentQ + 1); }
  };

  const goToPrev = () => {
    if (currentQ > 0) { setDirection(-1); setCurrentQ(currentQ - 1); }
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      toast({
        title: `${totalQ - answeredCount} question${totalQ - answeredCount !== 1 ? 's' : ''} left`,
        description: 'Please answer all questions before submitting.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!isAuthenticated) {
      toast({ title: 'Please login to submit', status: 'warning', duration: 3000 });
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const answerArray = questions.map((_, idx) => answers[idx] || '');
      const { data } = await submitQuiz(id, answerArray);
      navigate(`/quizzes/${id}/result`, { state: { result: data, quiz } });
    } catch (err) {
      toast({ title: 'Submission failed', description: err.response?.data?.message, status: 'error', duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={sectionBg} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="3px" color="purple.500" />
          <Text fontSize="sm" color="gray.500">Loading quiz...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Container py={20}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert status="error" borderRadius="xl" variant="left-accent"><AlertIcon /> {error}</Alert>
          <Button as={Link} to="/quizzes" mt={4} leftIcon={<FiArrowLeft />} variant="ghost" size="sm">Back to Quizzes</Button>
        </motion.div>
      </Container>
    );
  }

  const currentQuestion = questions[currentQ];
  const timeWarning = timeLeft !== null && timeLeft < 60;

  return (
    <Box minH="100vh" bg={sectionBg}>
      <Container maxW="900px" py={6}>
        {/* ════════════ TOP BAR ════════════ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} mb={4}>
            <CardBody py={3} px={5}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <HStack>
                  <Button as={Link} to="/quizzes" variant="ghost" size="xs" leftIcon={<FiArrowLeft />}>Quizzes</Button>
                  <Divider orientation="vertical" h="20px" />
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{quiz.title}</Text>
                    <Flex gap={2}>
                      <Badge colorScheme="purple" fontSize="2xs">{quiz.difficulty}</Badge>
                      {quiz.specialty && <Badge colorScheme="blue" fontSize="2xs">{quiz.specialty}</Badge>}
                    </Flex>
                  </Box>
                </HStack>
                <HStack spacing={4}>
                  <Tooltip label={`${answeredCount} of ${totalQ} answered`}>
                    <HStack spacing={1} cursor="pointer">
                      <Icon as={FiCheckSquare} color={allAnswered ? 'green.500' : 'purple.500'} />
                      <Text fontSize="sm" fontWeight="medium">{answeredCount}/{totalQ}</Text>
                    </HStack>
                  </Tooltip>
                  {timeLeft !== null && (
                    <Tooltip label="Time remaining">
                      <HStack spacing={1} color={timeWarning ? 'red.500' : 'gray.600'}>
                        <Icon as={FiClock} />
                        <Text fontSize="sm" fontWeight="bold" fontFamily="mono">{formatTime(timeLeft)}</Text>
                      </HStack>
                    </Tooltip>
                  )}
                </HStack>
              </Flex>
              <Progress value={progress} size="sm" colorScheme="purple" mt={2} borderRadius="full" bg={useColorModeValue('gray.100', 'gray.700')} hasStripe isAnimated />
            </CardBody>
          </Card>
        </motion.div>

        {/* ════════════ QUESTION GRID ════════════ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Flex wrap="wrap" gap={2} mb={5} justify="center">
            {questions.map((_, idx) => {
              const isAnswered = answers[idx] !== undefined;
              const isActive = currentQ === idx;
              return (
                <motion.div key={idx} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    w="38px" h="38px"
                    variant={isActive ? 'solid' : isAnswered ? 'solid' : 'outline'}
                    colorScheme={isAnswered ? 'green' : isActive ? 'purple' : 'gray'}
                    onClick={() => { setDirection(idx > currentQ ? 1 : -1); setCurrentQ(idx); }}
                    borderRadius="full"
                    fontSize="xs"
                    position="relative"
                  >
                    {idx + 1}
                    {isAnswered && (
                      <Box position="absolute" top="-3px" right="-3px">
                        <FiCheckCircle size={10} color={useColorModeValue('white', 'green.300')} />
                      </Box>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </Flex>
        </motion.div>

        {/* ════════════ QUESTION CARD ════════════ */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQ}
            custom={direction}
            variants={questionVariant}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} boxShadow="md" mb={4}>
              <CardBody px={6} py={6}>
                {/* Question header */}
                <Flex justify="space-between" align="center" mb={4}>
                  <HStack spacing={2}>
                    <Center w={8} h={8} borderRadius="full" bg="purple.500" color="white" fontSize="xs" fontWeight="bold">
                      {currentQ + 1}
                    </Center>
                    <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={3} py={1}>
                      Question {currentQ + 1} of {totalQ}
                    </Badge>
                  </HStack>
                  {answers[currentQ] !== undefined ? (
                    <Badge colorScheme="green" variant="solid" borderRadius="full" px={3} py={1}>
                      <HStack spacing={1}>
                        <FiCheckCircle size={12} />
                        <Text fontSize="2xs">Answered</Text>
                      </HStack>
                    </Badge>
                  ) : (
                    <Badge colorScheme="orange" variant="outline" borderRadius="full" px={3} py={1}>
                      <HStack spacing={1}>
                        <FiHelpCircle size={12} />
                        <Text fontSize="2xs">Pending</Text>
                      </HStack>
                    </Badge>
                  )}
                </Flex>

                {/* Question text */}
                <Text fontWeight="semibold" fontSize="lg" mb={6} lineHeight="1.6">
                  {currentQuestion.question}
                </Text>

                {/* Options */}
                <RadioGroup value={answers[currentQ] || ''} onChange={handleAnswer}>
                  <Stack spacing={3}>
                    {(currentQuestion.type === 'true_false'
                      ? ['True', 'False']
                      : currentQuestion.options || []
                    ).map((opt, idx) => (
                      <Box
                        key={idx}
                        p={4}
                        borderWidth="2px"
                        borderColor={answers[currentQ] === opt ? 'purple.500' : borderColor}
                        borderRadius="xl"
                        bg={answers[currentQ] === opt ? useColorModeValue('purple.50', 'purple.900') : 'transparent'}
                        cursor="pointer"
                        transition="all 0.15s"
                        _hover={{ borderColor: 'purple.300', bg: useColorModeValue('purple.50', 'purple.900') }}
                        onClick={() => handleAnswer(opt)}
                      >
                        <Radio value={opt} colorScheme="purple" size="lg">
                          <Text fontWeight="medium" ml={2}>{opt}</Text>
                        </Radio>
                      </Box>
                    ))}
                  </Stack>
                </RadioGroup>
              </CardBody>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* ════════════ NAVIGATION ════════════ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
            <CardBody py={3} px={5}>
              <Flex justify="space-between" align="center">
                <Button
                  leftIcon={<FiArrowLeft />}
                  variant="ghost"
                  onClick={goToPrev}
                  isDisabled={currentQ === 0}
                  size="sm"
                >
                  Previous
                </Button>

                {/* Submit / Next */}
                {currentQ === totalQ - 1 ? (
                  <Button
                    rightIcon={<FiSend />}
                    colorScheme="purple"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    loadingText="Submitting..."
                    size="md"
                    isDisabled={!allAnswered}
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    rightIcon={<FiArrowRight />}
                    colorScheme="purple"
                    onClick={goToNext}
                    size="md"
                  >
                    Next
                  </Button>
                )}
              </Flex>
            </CardBody>
          </Card>
        </motion.div>

        {/* ════════════ Time warning ════════════ */}
        {timeWarning && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Flex mt={3} p={3} bg="red.50" borderRadius="lg" align="center" gap={2}>
              <Icon as={FiAlertCircle} color="red.500" />
              <Text fontSize="sm" color="red.600" fontWeight="medium">
                Less than a minute remaining! Submit before time runs out.
              </Text>
            </Flex>
          </motion.div>
        )}
      </Container>
    </Box>
  );
};

export default QuizTakePage;
