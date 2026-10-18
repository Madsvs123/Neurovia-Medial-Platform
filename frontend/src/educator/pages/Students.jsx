import React, { useState, useEffect } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon, Badge, Flex,
  Button, useColorModeValue, useToast, Icon, Select, HStack, VStack, Avatar, Stat, StatLabel, StatNumber
} from '@chakra-ui/react';
import { FiUsers, FiAward, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { getMyPrograms, getEnrollmentsByProgram } from '../services/api';
import dayjs from 'dayjs';

const Students = () => {
  const toast = useToast();
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const fetchPrograms = async () => {
      try { setLoading(true); const { data } = await getMyPrograms({ limit: 100 }); setPrograms(data.programs || []); } catch (e) { setError('Failed to load programs'); } finally { setLoading(false); }
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (!selectedProgram) { setStudents([]); return; }
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const { data } = await getEnrollmentsByProgram(selectedProgram);
        // The backend returns program enrollments — each has a userId field
        // If the response doesn't have populated user info, we show what we can
        setStudents(data.enrollments || data.programEnrollments || []);
      } catch (err) {
        toast({ title: 'Failed to load students', status: 'error', duration: 3000 });
        setStudents([]);
      } finally { setLoadingStudents(false); }
    };
    fetchStudents();
  }, [selectedProgram, toast]);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Students</Heading>
          <Text fontSize="sm" color="gray.500">View students enrolled in your programs</Text>
        </Box>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex> : (
        <>
          <Box bg={cardBg} borderRadius="xl" boxShadow="sm" p={5} mb={6} borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
            <HStack spacing={4}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>Select Program</Text>
                <Select
                  placeholder="Choose a program..."
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  maxW="400px"
                >
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>{p.title} ({p.code})</option>
                  ))}
                </Select>
              </Box>
              {selectedProgram && (
                <Box pt={5}>
                  <Badge colorScheme="teal" borderRadius="full" px={3} py={1} fontSize="sm">
                    {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                  </Badge>
                </Box>
              )}
            </HStack>
          </Box>

          {!selectedProgram ? (
            <Box textAlign="center" py={16} color="gray.400">
              <Icon as={FiUsers} boxSize={12} mb={3} />
              <Heading size="md" mb={1}>Select a program</Heading>
              <Text fontSize="sm">Choose a program above to see enrolled students</Text>
            </Box>
          ) : loadingStudents ? (
            <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
          ) : students.length === 0 ? (
            <Box textAlign="center" py={16} color="gray.400">
              <Icon as={FiUsers} boxSize={12} mb={3} />
              <Heading size="md" mb={1}>No students enrolled</Heading>
              <Text fontSize="sm">This program has no enrolled students yet</Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {students.map((enrollment, idx) => {
                const user = enrollment.userId || {};
                return (
                  <Box key={enrollment._id || idx} bg={cardBg} borderRadius="xl" boxShadow="sm" p={4}
                    borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}
                    _hover={{ shadow: 'md' }} transition="all 0.2s">
                    <Flex align="center" gap={3} mb={3}>
                      <Avatar size="md" name={user.username || user.email || 'Student'} bg="teal.500" />
                      <Box flex="1" minW={0}>
                        <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                          {user.username || user.email || 'Unknown Student'}
                        </Text>
                        <Text fontSize="xs" color="gray.500">{user.email || ''}</Text>
                      </Box>
                    </Flex>
                    <HStack spacing={3} fontSize="xs" color="gray.500">
                      {enrollment.joinedAt && (
                        <HStack spacing={1}>
                          <FiCalendar size={12} />
                          <Text>Joined {dayjs(enrollment.joinedAt).format('MMM D, YYYY')}</Text>
                        </HStack>
                      )}
                      {user.status && (
                        <Badge colorScheme={user.status === 'active' ? 'green' : 'yellow'} borderRadius="full" fontSize="xs">
                          {user.status}
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
        </>
      )}
    </Box>
  );
};

export default Students;
