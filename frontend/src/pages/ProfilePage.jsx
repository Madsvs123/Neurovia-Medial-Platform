import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import {
  Box, Heading, Text, VStack, Container, SimpleGrid,
  Card, CardHeader, CardBody, CardFooter,
  Button, useColorModeValue, Spinner, Alert, AlertIcon,
  Stat, StatLabel, StatNumber, Divider, Badge, Flex,
  Avatar, Icon, HStack, Stack, useToast
} from '@chakra-ui/react';
import { FiUser, FiMail, FiClock, FiCalendar, FiCheckCircle, FiShield, FiBookOpen, FiEdit, FiMapPin, FiBriefcase, FiStar, FiHeart, FiLink, FiAward } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, getMyProfile, updateMyProfile } from '../services/api';

const ProfilePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await getMyProfile();
        setProfile(data);
      } catch (err) {
        if (err.response?.status === 404) {
          // Profile doesn't exist, create a basic one
          try {
            const { data: newProfile } = await updateMyProfile({
              fullName: user?.username || 'New User',
              profession: user?.role === 'admin' ? 'Administrator' : 'Medical Student',
              bio: user?.role === 'admin' ? 'Administrator account' : 'Medical student',
              country: 'US',
              yearsExperience: user?.role === 'admin' ? 5 : 0
            });
            setProfile(newProfile);
            toast({
              title: 'Profile created',
              description: 'A basic profile has been created for you',
              status: 'success',
              duration: 3000,
              isClosable: true
            });
          } catch (createErr) {
            console.error('Profile creation failed:', createErr);
            setError('Profile not found and could not be created automatically. Required fields may be missing.');
          }
        } else {
          setError(err.response?.data?.message || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <Container maxW="800px" py={20} textAlign="center">
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          Please login to view your profile
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="800px" py={20} textAlign="center">
        <Spinner size="xl" thickness="4px" color="teal.500" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="800px" py={20} textAlign="center">
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {error}
          {error === 'Profile not found and could not be created automatically. Required fields may be missing.' && (
            <Box mt={2}>
              <Text fontSize="sm">Your profile could not be loaded or created automatically.</Text>
              <Text fontSize="sm">Please try refreshing the page.</Text>
            </Box>
          )}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="1200px" py={12}>
      <VStack spacing={8} align="stretch">
        {/* Header with Avatar */}
        <Card bg={cardBg} borderRadius="2xl" boxShadow="xl" overflow="hidden">
          <Box bgGradient="linear(to-r, teal.500, blue.600)" h="120px" position="relative">
            <Avatar
              size="xl"
              name={user?.username}
              bg="teal.500"
              color="white"
              position="absolute"
              bottom="-60px"
              left="32px"
              borderWidth="4px"
              borderColor={cardBg}
            />
          </Box>
          <CardBody pt="70px" pb={4}>
            <Flex justify="space-between" align="center" mb={4}>
              <Box>
                <Heading size="xl">{user?.username}</Heading>
                <HStack spacing={3} mt={2}>
                  <Badge colorScheme={user?.role === 'admin' ? 'red' : 'teal'} px={2} py={1} borderRadius="full">
                    {user?.role}
                  </Badge>
                  <Badge colorScheme={user?.status === 'active' ? 'green' : 'yellow'} px={2} py={1} borderRadius="full">
                    {user?.status}
                  </Badge>
                </HStack>
              </Box>
              <Button colorScheme="teal" leftIcon={<FiEdit />}>Edit Profile</Button>
            </Flex>
            <Text color="gray.500" fontSize="md">
              {user?.email} • Member since {user?.createdAt ? new Date(user?.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </CardBody>
        </Card>

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg" p={6} textAlign="center">
            <Icon as={FiBookOpen} boxSize={8} color="teal.500" mb={2} />
            <Text fontSize="sm" color="gray.500" mb={1}>Courses</Text>
            <Text fontWeight="bold" fontSize="2xl">12</Text>
          </Card>
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg" p={6} textAlign="center">
            <Icon as={FiAward} boxSize={8} color="purple.500" mb={2} />
            <Text fontSize="sm" color="gray.500" mb={1}>Certificates</Text>
            <Text fontWeight="bold" fontSize="2xl">3</Text>
          </Card>
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg" p={6} textAlign="center">
            <Icon as={FiStar} boxSize={8} color="yellow.500" mb={2} />
            <Text fontSize="sm" color="gray.500" mb={1}>Achievements</Text>
            <Text fontWeight="bold" fontSize="2xl">5</Text>
          </Card>
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg" p={6} textAlign="center">
            <Icon as={FiHeart} boxSize={8} color="red.500" mb={2} />
            <Text fontSize="sm" color="gray.500" mb={1}>Favorites</Text>
            <Text fontWeight="bold" fontSize="2xl">8</Text>
          </Card>
        </SimpleGrid>

        {/* About Me Section */}
        <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
          <CardHeader pb={2}>
            <Heading size="md">About Me</Heading>
          </CardHeader>
          <CardBody>
            {profile?.bio ? (
              <Text fontSize="md" whiteSpace="pre-line" mb={4}>
                {profile.bio}
              </Text>
            ) : (
              <Text color="gray.500" mb={4}>No bio yet. Add a description about yourself.</Text>
            )}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiBriefcase} mr={2} />Profession</Text>
                <Text fontWeight="semibold">{profile?.profession || 'N/A'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiMapPin} mr={2} />Location</Text>
                <Text fontWeight="semibold">{profile?.country || 'N/A'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiCalendar} mr={2} />Experience</Text>
                <Text fontWeight="semibold">{profile?.yearsExperience || 0} years</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiBookOpen} mr={2} />University</Text>
                <Text fontWeight="semibold">{profile?.university || 'N/A'}</Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Skills Section */}
        {profile?.skills?.length > 0 && (
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
            <CardHeader pb={2}>
              <Heading size="md">Skills & Expertise</Heading>
            </CardHeader>
            <CardBody>
              <Flex wrap="wrap" gap={2} mb={4}>
                {profile.skills.map((skill, idx) => (
                  <Badge key={idx} colorScheme="teal" px={3} py={1} borderRadius="full">
                    {skill}
                  </Badge>
                ))}
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* Interests Section */}
        {profile?.interests?.length > 0 && (
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
            <CardHeader pb={2}>
              <Heading size="md">Interests</Heading>
            </CardHeader>
            <CardBody>
              <Flex wrap="wrap" gap={2} mb={4}>
                {profile.interests.map((interest, idx) => (
                  <Badge key={idx} colorScheme="blue" px={3} py={1} borderRadius="full">
                    {interest}
                  </Badge>
                ))}
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* Social Links */}
        {profile?.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
          <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
            <CardHeader pb={2}>
              <Heading size="md">Social & Professional Links</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={3}>
                {Object.entries(profile.socialLinks).map(([platform, url]) => (
                  <Box key={platform} p={3} bg="gray.50" borderRadius="md" _hover={{ bg: 'gray.100' }}>
                    <Flex align="center" gap={3}>
                      <Icon as={FiLink} boxSize={5} color="teal.500" />
                      <Box>
                        <Text fontWeight="medium">{platform}</Text>
                        <Text fontSize="sm" color="teal.500" wordBreak="break-all">{url}</Text>
                      </Box>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Account Information */}
        <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
          <CardHeader pb={2}>
            <Heading size="md">Account Information</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiMail} mr={2} />Email</Text>
                <Text fontWeight="semibold">{user?.email}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiShield} mr={2} />Role</Text>
                <Text fontWeight="semibold">{user?.role}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiCheckCircle} mr={2} />Status</Text>
                <Text fontWeight="semibold">{user?.status}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiClock} mr={2} />Last Login</Text>
                <Text fontWeight="semibold">{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiCalendar} mr={2} />Account Created</Text>
                <Text fontWeight="semibold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}><Icon as={FiAward} mr={2} />Subscription</Text>
                <Text fontWeight="semibold">{user?.subscriptionPlan || 'Free'}</Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Enrolled Programs */}
        <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
          <CardHeader>
            <Heading size="md">Enrolled Programs</Heading>
          </CardHeader>
          <CardBody>
            {user?.enrolledPrograms && user.enrolledPrograms.length > 0 ? (
              <VStack align="stretch" spacing={2}>
                {user.enrolledPrograms.map((programId) => (
                  <HStack key={programId} p={3} bg="blue.50" borderRadius="lg">
                    <Icon as={FiAward} color="blue.500" />
                    <Link to={`/programs/${programId}`} style={{ color: 'blue.500', fontWeight: 'semibold', textDecoration: 'underline' }}>
                      View Program
                    </Link>
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500" fontStyle="italic">No programs enrolled. Browse programs to get started.</Text>
            )}
          </CardBody>
        </Card>

        {/* Actions */}
        <Card bg={cardBg} borderRadius="xl" boxShadow="lg">
          <CardFooter justify="flex-end" gap={3}>
            <Button variant="outline" colorScheme="teal">
              Change Password
            </Button>
            <Button colorScheme="teal">
              Edit Profile
            </Button>
          </CardFooter>
        </Card>
      </VStack>
    </Container>
  );
};

export default ProfilePage;
