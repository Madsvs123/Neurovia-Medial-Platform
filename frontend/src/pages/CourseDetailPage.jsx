import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon,
  Badge, Flex, Button, useColorModeValue, Icon, VStack, HStack, Divider,
  Card, CardBody, Progress, Tag, TagLabel, Center,
} from '@chakra-ui/react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiBookOpen, FiClock, FiStar, FiBarChart, FiArrowLeft, FiPlayCircle,
  FiCheckCircle, FiChevronRight, FiUser, FiCalendar, FiTarget,
  FiLayers, FiAward, FiTrendingUp, FiZap,
} from 'react-icons/fi';
import { getCourseById, getLessonsByCourse } from '../services/api';

const LEVEL_COLORS = { beginner: 'green', intermediate: 'orange', advanced: 'red' };
const LEVEL_ICONS = { beginner: FiZap, intermediate: FiTrendingUp, advanced: FiAward };

const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
};
const cardVariant = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 180, damping: 20 } },
};

const CourseDetailPage = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const { data } = await getCourseById(id);
        setCourse(data.course);
        if (data.lessons) setLessons(data.lessons);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load course');
      } finally {
        setLoading(false);
        setTimeout(() => setAnimateIn(true), 100);
      }
    };
    fetchCourse();
  }, [id]);

  if (loading) {
    return (
      <Box minH="100vh" bg={sectionBg} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="3px" color="teal.500" />
          <Text fontSize="sm" color="gray.500">Loading course...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Container py={20}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert status="error" borderRadius="xl" variant="left-accent"><AlertIcon /> {error}</Alert>
          <Button as={Link} to="/courses" leftIcon={<FiArrowLeft />} variant="ghost" mt={4} size="sm">Back to Courses</Button>
        </motion.div>
      </Container>
    );
  }

  const totalDuration = lessons.reduce((sum, l) => sum + (l.estimatedReadTime || 0), 0);
  const LevelIcon = LEVEL_ICONS[course.level] || FiZap;

  return (
    <Box minH="100vh" bg={sectionBg}>
      {/* ════════════ HERO ════════════ */}
      <Box
        bgGradient="linear(135deg, #319795 0%, #2C7A7B 50%, #285E61 100%)"
        color="white"
        position="relative"
        overflow="hidden"
      >
        <Box position="absolute" top="-50px" right="-30px" w="200px" h="200px" borderRadius="full" bg="whiteAlpha.10" pointerEvents="none" />
        <Box position="absolute" bottom="-30px" left="-20px" w="140px" h="140px" borderRadius="full" bg="whiteAlpha.50" pointerEvents="none" />

        <Container maxW="1200px" position="relative" zIndex={1}>
          <Flex pt={4} pb={2}>
            <Button as={Link} to="/courses" variant="ghost" colorScheme="whiteAlpha" size="xs" leftIcon={<FiArrowLeft />} _hover={{ bg: 'whiteAlpha.200' }}>
              Courses
            </Button>
          </Flex>

          <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={8} pb={10}>
            <Box flex="1">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={animateIn ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
                <Flex wrap="wrap" gap={2} mb={3}>
                  <Badge bg="whiteAlpha.300" color="white" px={3} py={1} borderRadius="full">{course.category}</Badge>
                  <Badge colorScheme={LEVEL_COLORS[course.level]} px={3} py={1} borderRadius="full" textTransform="capitalize">{course.level}</Badge>
                  {course.specialty && <Badge bg="whiteAlpha.300" color="white" px={3} py={1} borderRadius="full">{course.specialty}</Badge>}
                </Flex>
                <Heading size="2xl" mb={2}>{course.title}</Heading>
                <Text opacity={0.85} fontSize="md" maxW="600px">{course.description}</Text>
                <Flex wrap="wrap" gap={4} mt={4} fontSize="sm" opacity={0.8}>
                  <HStack spacing={1.5}><FiUser size={14} /><Text>{course.instructorId?.username || 'Instructor'}</Text></HStack>
                  <HStack spacing={1.5}><FiClock size={14} /><Text>{course.estimatedDuration || totalDuration || 'Self-paced'} min</Text></HStack>
                  <HStack spacing={1.5}><FiLayers size={14} /><Text>{lessons.length} lesson{lessons.length !== 1 && 's'}</Text></HStack>
                  <HStack spacing={1.5}><FiStar size={14} /><Text>{course.rating > 0 ? `${course.rating.toFixed(1)} ⭐` : 'No ratings'}</Text></HStack>
                  <HStack spacing={1.5}><FiCalendar size={14} /><Text>{new Date(course.createdAt).toLocaleDateString()}</Text></HStack>
                </Flex>
              </motion.div>
            </Box>

            {/* Level icon graphic */}
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={animateIn ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.6, delay: 0.2 }}>
              <Box textAlign="center">
                <Box bg="whiteAlpha.200" p={5} borderRadius="2xl" textAlign="center" minW="140px">
                  <Icon as={LevelIcon} boxSize={10} mb={1} />
                  <Text fontSize="sm" fontWeight="bold" textTransform="capitalize">{course.level}</Text>
                  <Text fontSize="xs" opacity={0.7}>Level</Text>
                </Box>
              </Box>
            </motion.div>
          </Flex>
        </Container>
      </Box>

      {/* ════════════ CONTENT ════════════ */}
      <Container maxW="1200px" py={8}>
        <motion.div variants={containerVariant} initial="hidden" animate={animateIn ? 'visible' : 'hidden'}>
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
            {/* Left: Lessons */}
            <Box gridColumn={{ lg: 'span 2' }}>
              <motion.div variants={itemVariant}>
                {/* Course stats bar */}
                <Card bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} mb={6}>
                  <CardBody py={4}>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} textAlign="center">
                      <Box><Text fontSize="2xl" fontWeight="bold">{lessons.length}</Text><Text fontSize="xs" color="gray.500">Lessons</Text></Box>
                      <Box><Text fontSize="2xl" fontWeight="bold">{totalDuration || course.estimatedDuration || '—'}</Text><Text fontSize="xs" color="gray.500">Minutes</Text></Box>
                      <Box><Text fontSize="2xl" fontWeight="bold" textTransform="capitalize">{course.level}</Text><Text fontSize="xs" color="gray.500">Difficulty</Text></Box>
                      <Box><Text fontSize="2xl" fontWeight="bold">{course.enrollmentCount || 0}</Text><Text fontSize="xs" color="gray.500">Enrolled</Text></Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              </motion.div>

              <motion.div variants={itemVariant}>
                <Flex align="center" gap={3} mb={4}>
                  <Box bg="teal.500" p={1.5} borderRadius="md"><FiBookOpen size={16} color="white" /></Box>
                  <Heading size="md">Course Content</Heading>
                  <Badge colorScheme="teal" borderRadius="full" variant="subtle">{lessons.length} lesson{lessons.length !== 1 && 's'}</Badge>
                </Flex>
              </motion.div>

              {lessons.length === 0 ? (
                <motion.div variants={itemVariant}>
                  <Box textAlign="center" py={12} bg={cardBg} borderRadius="xl">
                    <Icon as={FiBookOpen} boxSize={10} color="gray.300" mb={3} />
                    <Text color="gray.500">No lessons available yet.</Text>
                  </Box>
                </motion.div>
              ) : (
                <VStack spacing={3} align="stretch">
                  {lessons.map((lesson, idx) => (
                    <motion.div key={lesson._id} variants={itemVariant}>
                      <Link to={`/courses/${course._id}/lessons/${lesson._id}`} style={{ textDecoration: 'none' }}>
                        <Card
                          bg={cardBg}
                          borderRadius="xl"
                          borderWidth="1px"
                          borderColor={borderColor}
                          _hover={{ borderColor: 'teal.400', shadow: 'md', transform: 'translateX(4px)' }}
                          transition="all 0.2s"
                          cursor="pointer"
                        >
                          <CardBody py={3} px={4}>
                            <Flex align="center" gap={4}>
                              {/* Numbered step */}
                              <Center
                                w={9} h={9}
                                borderRadius="full"
                                bg="teal.500"
                                color="white"
                                flexShrink={0}
                                fontSize="sm"
                                fontWeight="bold"
                              >
                                {idx + 1}
                              </Center>
                              <Box flex="1" minW={0}>
                                <Text fontWeight="semibold">{lesson.title}</Text>
                                {lesson.description && (
                                  <Text fontSize="sm" color="gray.500" noOfLines={1}>{lesson.description}</Text>
                                )}
                              </Box>
                              <HStack spacing={3} fontSize="xs" color="gray.500" flexShrink={0}>
                                {lesson.estimatedReadTime && (
                                  <HStack spacing={1}>
                                    <FiClock size={12} />
                                    <Text>{lesson.estimatedReadTime} min</Text>
                                  </HStack>
                                )}
                                <Icon as={FiPlayCircle} boxSize={5} color="teal.400" />
                              </HStack>
                            </Flex>
                          </CardBody>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </VStack>
              )}
            </Box>

            {/* Right: Sidebar */}
            <Box>
              <motion.div variants={cardVariant}>
                <Card
                  bg={cardBg}
                  borderRadius="2xl"
                  borderWidth="1px"
                  borderColor={borderColor}
                  position="sticky"
                  top={24}
                  overflow="hidden"
                >
                  {/* Header graphic */}
                  <Box
                    h="140px"
                    bgGradient="linear(135deg, #319795, #2C7A7B)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                  >
                    <Box position="absolute" top="-20px" right="-10px" w="100px" h="100px" borderRadius="full" bg="whiteAlpha.10" />
                    <Icon as={FiBookOpen} boxSize={12} color="white" opacity={0.6} />
                    <Box position="absolute" bottom={3} left={4}>
                      <Badge bg="whiteAlpha.300" color="white" borderRadius="full" px={2} py={0.5}>
                        {course.price > 0 ? `$${course.price}` : 'Free'}
                      </Badge>
                    </Box>
                  </Box>

                  <Box p={5}>
                    <VStack spacing={4} align="stretch">
                      <Button
                        colorScheme="teal"
                        size="lg"
                        w="full"
                        leftIcon={<FiPlayCircle />}
                        as={Link}
                        to={lessons.length > 0 ? `/courses/${course._id}/lessons/${lessons[0]._id}` : '#'}
                      >
                        {lessons.length > 0 ? 'Start First Lesson' : 'Coming Soon'}
                      </Button>

                      <Divider />

                      {/* Course details */}
                      <VStack spacing={2.5} align="stretch" fontSize="sm">
                        <Flex justify="space-between"><Text color="gray.500">Duration</Text><Text fontWeight="semibold">{course.estimatedDuration || totalDuration || 'Self-paced'} min</Text></Flex>
                        <Flex justify="space-between"><Text color="gray.500">Lessons</Text><Text fontWeight="semibold">{lessons.length}</Text></Flex>
                        <Flex justify="space-between"><Text color="gray.500">Level</Text><Text fontWeight="semibold" textTransform="capitalize">{course.level}</Text></Flex>
                        <Flex justify="space-between"><Text color="gray.500">Language</Text><Text fontWeight="semibold">{course.language || 'English'}</Text></Flex>
                        <Flex justify="space-between"><Text color="gray.500">Enrolled</Text><Text fontWeight="semibold">{course.enrollmentCount || 0}</Text></Flex>
                        <Flex justify="space-between"><Text color="gray.500">Instructor</Text><Text fontWeight="semibold" noOfLines={1}>{course.instructorId?.username || '—'}</Text></Flex>
                      </VStack>

                      <Divider />

                      {/* Tags */}
                      {course.tags && course.tags.length > 0 && (
                        <>
                          <Text fontSize="xs" fontWeight="semibold" color="gray.500">TAGS</Text>
                          <Flex wrap="wrap" gap={1.5}>
                            {course.tags.map((tag, i) => (
                              <Tag key={i} size="sm" colorScheme="teal" borderRadius="full"><TagLabel>{tag}</TagLabel></Tag>
                            ))}
                          </Flex>
                        </>
                      )}
                    </VStack>
                  </Box>
                </Card>
              </motion.div>
            </Box>
          </SimpleGrid>
        </motion.div>
      </Container>
    </Box>
  );
};

export default CourseDetailPage;
