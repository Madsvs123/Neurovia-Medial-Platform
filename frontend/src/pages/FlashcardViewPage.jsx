import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, Icon, useToast, HStack, VStack, Divider,
} from '@chakra-ui/react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiZap, FiRotateCw,
  FiCheckCircle, FiBookmark,
} from 'react-icons/fi';
import { getFlashcardById } from '../services/api';

const FlashcardViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const clickable = true;

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        const { data } = await getFlashcardById(id);
        setCard(data.flashcard);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load flashcard');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [id]);

  const handleFlip = () => setFlipped(!flipped);

  if (loading) {
    return (
      <Box minH="100vh" bg={sectionBg} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}><Spinner size="xl" thickness="3px" color="orange.500" /><Text fontSize="sm" color="gray.500">Loading flashcard...</Text></VStack>
      </Box>
    );
  }

  if (error || !card) {
    return (
      <Container py={20}>
        <Alert status="error" borderRadius="xl" variant="left-accent"><AlertIcon /> {error || 'Flashcard not found'}</Alert>
        <Button as={Link} to="/programs" leftIcon={<FiArrowLeft />} variant="ghost" mt={4} size="sm">Browse Programs</Button>
      </Container>
    );
  }

  return (
    <Box minH="100vh" bg={sectionBg}>
      {/* Top bar */}
      <Box bg="white" borderBottomWidth="1px" borderColor={borderColor} position="sticky" top={0} zIndex={10}>
        <Container maxW="800px" py={3}>
          <Flex justify="space-between" align="center">
            <Button as={Link} to="/programs" variant="ghost" size="sm" leftIcon={<FiArrowLeft />}>
              Programs
            </Button>
            <HStack spacing={2}>
              <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={3} py={1}>
                <HStack spacing={1}><FiZap size={12} /><Text>Flashcard</Text></HStack>
              </Badge>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="800px" py={8}>
        <VStack spacing={6}>
          {/* Topic label */}
          <HStack spacing={2}>
            <Icon as={FiBookmark} color="orange.500" />
            <Text fontSize="sm" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wider">{card.topic}</Text>
          </HStack>

          {/* Flashcard */}
          <Box w="full" cursor="pointer" onClick={handleFlip} sx={{ perspective: '1200px' }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
              style={{ width: '100%', transformStyle: 'preserve-3d' }}
            >
              <Box
                bg={cardBg}
                borderRadius="2xl"
                borderWidth="2px"
                borderColor={flipped ? 'orange.300' : borderColor}
                boxShadow="xl"
                minH="320px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                p={10}
                position="relative"
              >
                {/* Flip hint */}
                <Badge
                  position="absolute" top={4} right={4}
                  colorScheme="orange" variant="subtle" borderRadius="full"
                  fontSize="2xs" px={2}
                >
                  <HStack spacing={1}>
                    <FiRotateCw size={10} />
                    <Text>Flip</Text>
                  </HStack>
                </Badge>

                {/* Front */}
                <Box sx={{ backfaceVisibility: 'hidden' }} w="full" opacity={flipped ? 0 : 1} transition="opacity 0.15s">
                  <VStack spacing={4}>
                    <Badge colorScheme="orange" variant="solid" borderRadius="full" px={3} py={0.5} fontSize="xs">QUESTION</Badge>
                    <Text fontSize="xl" fontWeight="bold" textAlign="center" lineHeight="1.6">
                      {card.front}
                    </Text>
                  </VStack>
                </Box>

                {/* Back */}
                <Box
                  position="absolute"
                  top={0} left={0} right={0} bottom={0}
                  p={10}
                  sx={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  w="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  opacity={flipped ? 1 : 0}
                  transition="opacity 0.15s"
                >
                  <VStack spacing={4}>
                    <Badge colorScheme="green" variant="solid" borderRadius="full" px={3} py={0.5} fontSize="xs">ANSWER</Badge>
                    <Text fontSize="xl" fontWeight="bold" textAlign="center" lineHeight="1.6" color="green.700">
                      {card.back}
                    </Text>
                  </VStack>
                </Box>
              </Box>
            </motion.div>
          </Box>

          {/* Flip button */}
          <Button colorScheme="orange" variant="outline" onClick={handleFlip} leftIcon={<FiRotateCw />} borderRadius="full" size="md">
            {flipped ? 'Show Question' : 'Show Answer'}
          </Button>

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <>
              <Divider />
              <Text fontSize="xs" fontWeight="semibold" color="gray.500">TAGS</Text>
              <Flex wrap="wrap" gap={2} justify="center">
                {card.tags.map((tag, i) => (
                  <Badge key={i} colorScheme="orange" variant="subtle" borderRadius="full" px={3} py={1}>{tag}</Badge>
                ))}
              </Flex>
            </>
          )}

          {/* Stats */}
          <Divider />
          <Flex gap={6} wrap="wrap" justify="center">
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">{card.reviewCount || 0}</Text>
              <Text fontSize="xs" color="gray.500">Reviews</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">{card.masteryLevel || 0}%</Text>
              <Text fontSize="xs" color="gray.500">Mastery</Text>
            </Box>

          </Flex>
        </VStack>
      </Container>
    </Box>
  );
};

export default FlashcardViewPage;
