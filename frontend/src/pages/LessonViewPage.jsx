import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, Spinner, Alert, AlertIcon, Badge,
  Flex, Button, useColorModeValue, Icon, Divider
} from '@chakra-ui/react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiCheckCircle, FiPlayCircle, FiMessageSquare } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { getLessonById } from '../services/api';

const LessonViewPage = () => {
  const { courseId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setLoading(true);
        const { data } = await getLessonById(lessonId);
        setLesson(data.lesson);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [lessonId]);

  if (loading) {
    return (
      <Container py={20} textAlign="center">
        <Spinner size="xl" thickness="4px" color="teal.500" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container py={20}>
        <Alert status="error" borderRadius="lg">
          <AlertIcon /> {error}
        </Alert>
        <Button as={Link} to={`/courses/${courseId}`} leftIcon={<FiArrowLeft />} variant="link" colorScheme="teal" mt={4}>
          Back to Course
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="1000px" py={8}>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={2}>
        <Button
          as={Link}
          to={`/courses/${courseId}`}
          leftIcon={<FiArrowLeft />}
          variant="ghost"
          colorScheme="teal"
          size="sm"
        >
          Back to Course
        </Button>
        {userInfo?.role === 'student' && (
          <Button
            as={Link}
            to={`/messages/new?kind=direct&courseId=${courseId}&lessonId=${lessonId}&subject=${encodeURIComponent(`Question about: ${lesson.title}`)}`}
            leftIcon={<FiMessageSquare />}
            variant="outline"
            colorScheme="teal"
            size="sm"
          >
            Ask your instructor
          </Button>
        )}
      </Flex>

      <Box bg={cardBg} borderRadius="2xl" boxShadow="xl" overflow="hidden">
        {/* Header */}
        <Box bgGradient="linear(135deg, teal.500, blue.600)" p={8} color="white">
          <Flex align="center" gap={3} mb={2}>
            <Icon as={FiPlayCircle} boxSize={6} />
            <Heading size="lg">{lesson.title}</Heading>
          </Flex>
          <Flex gap={4} fontSize="sm" opacity={0.9}>
            {lesson.estimatedReadTime && (
              <Flex align="center" gap={1}>
                <FiClock />
                <Text>{lesson.estimatedReadTime} min read</Text>
              </Flex>
            )}
            {lesson.order !== undefined && (
              <Badge colorScheme="whiteAlpha" px={2} borderRadius="full">
                Lesson {lesson.order}
              </Badge>
            )}
          </Flex>
        </Box>

        {/* Content */}
        <Box p={8}>
          {lesson.description && (
            <>
              <Heading size="sm" mb={2} color="gray.500">Overview</Heading>
              <Text fontSize="lg" mb={8} whiteSpace="pre-line">{lesson.description}</Text>
              <Divider mb={8} />
            </>
          )}

          {/* Video */}
          {lesson.videoUrl && (
            <Box mb={8}>
              <Heading size="sm" mb={3}>Video</Heading>
              <Box
                as="iframe"
                src={lesson.videoUrl}
                w="full"
                h="400px"
                borderRadius="xl"
                allowFullScreen
              />
            </Box>
          )}

          {/* Text content */}
          <Box
            className="lesson-content"
            fontSize="md"
            lineHeight="1.8"
            sx={{
              'h1, h2, h3': { mt: 6, mb: 3, fontWeight: 'bold' },
              'p': { mb: 4 },
              'ul, ol': { mb: 4, pl: 6 },
              'li': { mb: 2 },
              'img': { borderRadius: 'lg', my: 4, maxW: 'full' },
              'blockquote': {
                borderLeft: '4px solid',
                borderColor: 'teal.400',
                pl: 4,
                py: 2,
                my: 4,
                bg: 'gray.50',
                borderRadius: 'md',
                fontStyle: 'italic'
              },
              'pre': {
                bg: 'gray.900',
                color: 'green.300',
                p: 4,
                borderRadius: 'lg',
                overflowX: 'auto',
                my: 4
              },
              'code': {
                bg: 'gray.100',
                px: 1,
                borderRadius: 'sm',
                fontSize: 'sm'
              }
            }}
            dangerouslySetInnerHTML={{ __html: lesson.content || '' }}
          />

          {!lesson.content && !lesson.videoUrl && (
            <Box textAlign="center" py={10}>
              <Icon as={FiCheckCircle} boxSize={12} color="teal.300" mb={4} />
              <Text color="gray.500">No content available for this lesson yet.</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default LessonViewPage;
