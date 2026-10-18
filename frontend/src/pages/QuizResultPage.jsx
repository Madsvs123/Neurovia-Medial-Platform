import React from 'react';
import {
  Box, Container, Heading, Text, Badge, Flex, Button, useColorModeValue,
  Icon, VStack, Divider, Progress, Card, CardBody, SimpleGrid, HStack,
  Alert, AlertIcon, Center, Tooltip,
} from '@chakra-ui/react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiClipboard, FiCheckCircle, FiXCircle, FiRefreshCw, FiArrowLeft,
  FiAward, FiBookOpen, FiHome, FiBarChart2, FiStar, FiTarget,
  FiTrendingUp, FiZap, FiFlag, FiChevronRight,
} from 'react-icons/fi';

const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
};

const AnimatedScoreRing = ({ percentage, passed, passingScore }) => {
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = passed ? '#38A169' : '#E53E3E';

  return (
    <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Box position="absolute" textAlign="center">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
        >
          <Text fontSize="4xl" fontWeight="extrabold" lineHeight="1">{percentage}%</Text>
          <Badge colorScheme={passed ? 'green' : 'red'} borderRadius="full" px={3} py={0.5} fontSize="xs" mt={1}>
            {passed ? 'PASSED' : 'NOT PASSED'}
          </Badge>
        </motion.div>
      </Box>
    </Box>
  );
};

const QuizResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const { result, quiz } = location.state || {};

  if (!result) {
    return (
      <Container py={20}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert status="warning" borderRadius="xl" variant="left-accent"><AlertIcon /> No quiz results found.</Alert>
          <Button as={Link} to="/quizzes" mt={4} leftIcon={<FiArrowLeft />} variant="ghost" size="sm">Browse Quizzes</Button>
        </motion.div>
      </Container>
    );
  }

  const percentage = Math.round(result.percentage);
  const passed = result.passed;
  const correctCount = result.correctAnswers;
  const totalQuestions = result.totalQuestions;
  const wrongCount = totalQuestions - correctCount;
  const passingScore = result.passingScore;
  const resultsList = result.results || [];

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Container maxW="1000px" py={6}>
        {/* ════════════ SCORE HERO ════════════ */}
        <motion.div variants={containerVariant} initial="hidden" animate="visible">
          <motion.div variants={itemVariant}>
            <Card
              bg={cardBg}
              borderRadius="2xl"
              borderWidth="1px"
              borderColor={borderColor}
              overflow="hidden"
              mb={6}
            >
              <Box
                bgGradient={passed
                  ? 'linear(135deg, #276749 0%, #38A169 50%, #48BB78 100%)'
                  : 'linear(135deg, #9B2C2C 0%, #E53E3E 50%, #FC8181 100%)'
                }
                p={8}
                textAlign="center"
                color="white"
                position="relative"
                overflow="hidden"
              >
                <Box position="absolute" top="-40px" right="-20px" w="160px" h="160px" borderRadius="full" bg="whiteAlpha.10" />
                <Box position="absolute" bottom="-30px" left="-10px" w="120px" h="120px" borderRadius="full" bg="whiteAlpha.50" />

                <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="center" gap={8} position="relative" zIndex={1}>
                  <AnimatedScoreRing percentage={percentage} passed={passed} passingScore={passingScore} />

                  <Box textAlign={{ base: 'center', md: 'left' }}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
                      {percentage === 100 ? (
                        <HStack spacing={2} justify={{ base: 'center', md: 'flex-start' }} mb={2}>
                          <Icon as={FiAward} boxSize={6} />
                          <Heading size="lg">Perfect Score! 🎉</Heading>
                        </HStack>
                      ) : passed ? (
                        <HStack spacing={2} justify={{ base: 'center', md: 'flex-start' }} mb={2}>
                          <Icon as={FiStar} boxSize={6} />
                          <Heading size="lg">Congratulations!</Heading>
                        </HStack>
                      ) : (
                        <HStack spacing={2} justify={{ base: 'center', md: 'flex-start' }} mb={2}>
                          <Icon as={FiRefreshCw} boxSize={6} />
                          <Heading size="lg">Keep Practicing</Heading>
                        </HStack>
                      )}
                      <Text opacity={0.9} fontSize="md">
                        {percentage === 100
                          ? 'You answered every question correctly. Outstanding!'
                          : passed
                            ? `You passed with ${percentage}% (passing score: ${passingScore}%)`
                            : `You scored ${percentage}% — the passing score is ${passingScore}%. Review the answers below and try again.`
                        }
                      </Text>
                    </motion.div>
                  </Box>
                </Flex>
              </Box>

              <CardBody p={5}>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} textAlign="center">
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold">{totalQuestions}</Text>
                    <Text fontSize="xs" color="gray.500">Questions</Text>
                  </Box>
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">{correctCount}</Text>
                    <Text fontSize="xs" color="gray.500">Correct</Text>
                  </Box>
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold" color="red.500">{wrongCount}</Text>
                    <Text fontSize="xs" color="gray.500">Incorrect</Text>
                  </Box>
                  <Box>
                    <Text fontSize="2xl" fontWeight="bold">{passingScore}%</Text>
                    <Text fontSize="xs" color="gray.500">Required</Text>
                  </Box>
                </SimpleGrid>
                <Progress value={percentage} size="md" colorScheme={passed ? 'green' : 'red'} borderRadius="full" mt={3} />
                <Flex justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.400">0%</Text>
                  <Text fontSize="xs" color="gray.400">{passingScore}% pass</Text>
                  <Text fontSize="xs" color="gray.400">100%</Text>
                </Flex>
              </CardBody>
            </Card>
          </motion.div>

          {/* ════════════ QUESTION REVIEW ════════════ */}
          <motion.div variants={itemVariant}>
            <Flex align="center" gap={3} mb={4}>
              <Box bg="purple.500" p={1.5} borderRadius="md">
                <Icon as={FiTarget} boxSize={4} color="white" />
              </Box>
              <Heading size="md">Question Review</Heading>
              <Badge colorScheme="purple" borderRadius="full" variant="subtle">
                {correctCount}/{totalQuestions} correct
              </Badge>
            </Flex>
          </motion.div>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {resultsList.map((r, idx) => (
              <motion.div key={idx} variants={itemVariant}>
                <Card
                  bg={cardBg}
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor={r.isCorrect ? 'green.200' : 'red.200'}
                  borderLeft="5px"
                  borderLeftColor={r.isCorrect ? 'green.400' : 'red.400'}
                  overflow="hidden"
                  _hover={{ shadow: 'md' }}
                  transition="all 0.2s"
                >
                  <CardBody p={4}>
                    <Flex gap={3} align="flex-start">
                      <Center
                        w={8} h={8} borderRadius="full"
                        bg={r.isCorrect ? 'green.100' : 'red.100'}
                        color={r.isCorrect ? 'green.600' : 'red.600'}
                        flexShrink={0}
                      >
                        <Icon as={r.isCorrect ? FiCheckCircle : FiXCircle} boxSize={5} />
                      </Center>
                      <Box flex="1" minW={0}>
                        <Flex justify="space-between" mb={1.5}>
                          <Badge colorScheme={r.isCorrect ? 'green' : 'red'} borderRadius="full" fontSize="2xs">
                            Q{idx + 1} — {r.isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </Flex>
                        <Text fontWeight="semibold" fontSize="sm" mb={2}>{r.question}</Text>
                        <Box fontSize="xs" p={2} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                          <Text color="gray.500">
                            Your answer:{' '}
                            <Text as="span" fontWeight="semibold" color={r.isCorrect ? 'green.600' : 'red.500'}>
                              {r.userAnswer || '(no answer)'}
                            </Text>
                          </Text>
                          {!r.isCorrect && (
                            <Text color="gray.500" mt={1}>
                              Correct:{' '}
                              <Text as="span" fontWeight="semibold" color="green.600">{r.correctAnswer}</Text>
                            </Text>
                          )}
                        </Box>
                        {r.explanation && (
                          <Box mt={2.5} p={2.5} bg={useColorModeValue('purple.50', 'purple.900')} borderRadius="md">
                            <HStack spacing={1.5} mb={0.5}>
                              <Icon as={FiZap} boxSize={3} color="purple.500" />
                              <Text fontSize="xs" fontWeight="semibold" color="purple.600">Explanation</Text>
                            </HStack>
                            <Text fontSize="xs" color="purple.700">{r.explanation}</Text>
                          </Box>
                        )}
                      </Box>
                    </Flex>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </SimpleGrid>

          {/* ════════════ ACTIONS ════════════ */}
          <motion.div variants={itemVariant}>
            <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} mt={6}>
              <CardBody py={4}>
                <Flex justify="center" gap={3} wrap="wrap">
                  <Button
                    as={Link} to="/quizzes"
                    leftIcon={<FiClipboard />}
                    variant="outline"
                    colorScheme="purple"
                    size="sm"
                  >
                    More Quizzes
                  </Button>
                  <Button
                    as={Link} to="/programs"
                    leftIcon={<FiBarChart2 />}
                    variant="outline"
                    colorScheme="blue"
                    size="sm"
                  >
                    All Programs
                  </Button>
                  <Button
                    as={Link} to="/"
                    leftIcon={<FiHome />}
                    colorScheme="purple"
                    size="sm"
                  >
                    Home
                  </Button>
                </Flex>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default QuizResultPage;
