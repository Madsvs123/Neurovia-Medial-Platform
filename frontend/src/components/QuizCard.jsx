import React from 'react';
import { Box, Heading, Text, Button, useColorModeValue, Icon, Flex, Badge, HStack, Divider, Center } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClipboard, FiClock, FiPlay, FiRepeat, FiCheckCircle, FiXCircle, FiZap } from 'react-icons/fi';

const QuizCard = ({ quiz, completed = false, status, index = 0 }) => {
  const statusPassed = status?.passed === true || status?.passed === 'true';
  const statusFailed = status?.passed === false || status?.passed === 'false';
  const isCompleted = completed || status !== undefined;
  const questionCount = quiz.questions?.length || 0;
  const difficultyLabel = (quiz.difficulty || 'medium').charAt(0).toUpperCase() + (quiz.difficulty || 'medium').slice(1);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const passedBg = useColorModeValue('green.50', 'green.900');
  const failedBg = useColorModeValue('red.50', 'red.900');

  const bg = statusPassed ? passedBg : statusFailed ? failedBg : cardBg;
  const bdr = statusPassed ? 'green.300' : statusFailed ? 'red.300' : borderColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ y: -3 }}
    >
      <Link to={`/quizzes/${quiz._id}`} style={{ textDecoration: 'none' }}>
        <Box
          bg={bg}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={bdr}
          overflow="hidden"
          transition="all 0.2s"
          _hover={{ shadow: 'md', borderColor: statusPassed ? 'green.400' : statusFailed ? 'red.400' : 'purple.400' }}
          h="full"
          display="flex"
          flexDirection="column"
          position="relative"
        >
          {/* Status banner */}
          {statusPassed && (
            <Flex h="28px" bg="green.500" color="white" align="center" justify="center" gap={1.5} fontSize="xs" fontWeight="bold">
              <FiCheckCircle size={14} />
              <Text>PASSED</Text>
              {status?.score !== undefined && <Text ml={1}>{Math.round(status.score)}%</Text>}
            </Flex>
          )}
          {statusFailed && (
            <Flex h="28px" bg="red.500" color="white" align="center" justify="center" gap={1.5} fontSize="xs" fontWeight="bold">
              <FiXCircle size={14} />
              <Text>FAILED</Text>
              {status?.score !== undefined && <Text ml={1}>{Math.round(status.score)}%</Text>}
            </Flex>
          )}

          <Box p={5} flex="1" display="flex" flexDirection="column">
            {/* Header row */}
            <Flex justify="space-between" align="center" mb={3}>
              <Badge colorScheme="purple" variant="subtle" px={2.5} py={1} borderRadius="full" fontSize="2xs">
                {difficultyLabel}
              </Badge>
              <HStack spacing={1} bg="purple.50" px={2.5} py={1} borderRadius="full">
                <FiClipboard size={12} color="#805AD5" />
                <Text fontSize="xs" fontWeight="bold" color="purple.600">{questionCount}</Text>
                <Text fontSize="2xs" color={mutedColor}>Q</Text>
              </HStack>
            </Flex>

            {/* Title */}
            <Heading size="sm" noOfLines={2} mb={3} minH="44px">{quiz.title}</Heading>

            {/* Meta */}
            <Flex align="center" gap={2} mb={3} fontSize="xs" color={mutedColor} flexWrap="wrap">
              {quiz.timeLimit && (
                <HStack spacing={1}><FiClock size={12} /><Text>{quiz.timeLimit} min</Text></HStack>
              )}
              {quiz.passingScore && (
                <><Text color="gray.300">·</Text><Text>Pass: {quiz.passingScore}%</Text></>
              )}
            </Flex>

            <Divider mb={3} />

            {/* Topics tags */}
            {quiz.specialty && (
              <Flex wrap="wrap" gap={1} mb={3}>
                <Badge colorScheme="blue" variant="subtle" fontSize="2xs" borderRadius="full" px={2}>{quiz.specialty}</Badge>
              </Flex>
            )}

            {/* Spacer + CTA */}
            <Box flex="1" />
            <Button
              size="sm" w="full"
              variant={isCompleted ? 'outline' : 'solid'}
              colorScheme={statusFailed ? 'red' : statusPassed ? 'green' : 'purple'}
              leftIcon={isCompleted ? <FiRepeat size={14} /> : <FiPlay size={14} />}
              borderRadius="full"
            >
              {isCompleted ? 'Retake' : 'Start Quiz'}
            </Button>
          </Box>

          {/* Premium indicator */}
          {quiz.premiumOnly && !statusPassed && !statusFailed && (
            <Box position="absolute" top={3} right={3}>
              <Icon as={FiZap} boxSize={4} color="orange.400" />
            </Box>
          )}
        </Box>
      </Link>
    </motion.div>
  );
};

export default QuizCard;
