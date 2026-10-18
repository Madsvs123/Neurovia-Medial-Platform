import React from 'react';
import { Box, Heading, Text, Button, useColorModeValue, Badge, Flex, HStack, Icon } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiClock, FiBookOpen, FiStar, FiUser } from 'react-icons/fi';

const LEVEL_COLORS = { beginner: 'green', intermediate: 'orange', advanced: 'red' };

const CourseCard = ({ course, owned = false, index = 0 }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const lessonCount = course.lessons?.length || course.totalLessons || course.lessonCount || '—';
  const rating = course.rating || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ y: -3 }}
    >
      <Link to={`/courses/${course._id}`} style={{ textDecoration: 'none' }}>
        <Box
          bg={cardBg}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
          transition="all 0.2s"
          _hover={{ shadow: 'md', borderColor: 'teal.400' }}
          h="full"
          display="flex"
          flexDirection="column"
        >
          {/* Gradient header */}
          <Box
            h="100px"
            bgGradient="linear(135deg, #319795, #2C7A7B)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <Icon as={FiBookOpen} boxSize={10} color="white" opacity={0.3} />
            <Badge
              position="absolute" top={3} right={3}
              colorScheme={owned ? 'purple' : 'whiteAlpha'}
              variant="solid"
              fontSize="2xs" px={2} py={0.5} borderRadius="full"
            >
              {owned ? 'Your Course' : course.category || 'Course'}
            </Badge>
            {course.level && (
              <Badge
                position="absolute" bottom={3} left={3}
                colorScheme={LEVEL_COLORS[course.level] || 'gray'}
                variant="solid"
                fontSize="2xs" px={2} py={0.5} borderRadius="full"
                textTransform="capitalize"
              >
                {course.level}
              </Badge>
            )}
          </Box>

          <Box p={4} flex="1" display="flex" flexDirection="column">
            {/* Title + rating */}
            <Flex justify="space-between" align="flex-start" mb={1}>
              <Heading size="sm" noOfLines={2} flex="1">{course.title}</Heading>
              {rating > 0 && (
                <HStack spacing={0.5} ml={2} flexShrink={0}>
                  <FiStar size={12} color="#ECC94B" />
                  <Text fontSize="xs" fontWeight="bold">{rating.toFixed(1)}</Text>
                </HStack>
              )}
            </Flex>

            {course.description && (
              <Text fontSize="xs" color={mutedColor} noOfLines={2} mb={3} mt={1}>
                {course.description}
              </Text>
            )}

            <Box flex="1" />

            {/* Meta footer */}
            <Flex align="center" justify="space-between" pt={3} borderTopWidth="1px" borderColor={borderColor}>
              <HStack spacing={3} fontSize="xs" color={mutedColor}>
                <HStack spacing={1}><FiBookOpen size={12} /><Text>{lessonCount} lesson{lessonCount !== 1 ? 's' : ''}</Text></HStack>
                {course.estimatedDuration && (
                  <HStack spacing={1}><FiClock size={12} /><Text>{course.estimatedDuration} min</Text></HStack>
                )}
              </HStack>
              <Button size="xs" variant="ghost" colorScheme="teal" rightIcon={<FiArrowRight size={12} />}>
                {course.price > 0 ? `$${course.price}` : 'Free'}
              </Button>
            </Flex>
          </Box>
        </Box>
      </Link>
    </motion.div>
  );
};

export default CourseCard;
