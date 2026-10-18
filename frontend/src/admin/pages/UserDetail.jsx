import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Flex, Heading, Text, SimpleGrid, Button, Badge, Spinner,
  Alert, AlertIcon, Avatar, VStack, Divider, useColorModeValue,
  FormControl, FormLabel, Select, useToast, IconButton,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Stat, StatLabel, StatNumber, StatHelpText,
  HStack, Progress, Wrap, WrapItem,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiMail, FiCalendar, FiShield, FiCheckCircle, FiXCircle, FiClock, FiUser } from 'react-icons/fi';
import { getUserById, updateUser } from '../services/api';
import dayjs from 'dayjs';

const AdminUserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = location.pathname.endsWith('/edit');
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentBg = useColorModeValue('teal.50', 'teal.900');
  const labelColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => { if (id) fetchUserData(); }, [id]);

  const fetchUserData = async () => {
    try { setLoading(true); setError(null);
      const { data } = await getUserById(id);
      const u = data.user || data;
      setUser(u); setProfile(data.profile || null);
      setForm({ role: u.role || 'student', status: u.status || 'active', username: u.username || '', email: u.email || '' });
    } catch (err) { setError(err.response?.data?.message || 'User not found'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try { setSaving(true);
      await updateUser(id, { role: form.role, status: form.status });
      toast({ title: 'User updated', status: 'success', duration: 3000 });
      navigate(`/admin/users/${id}`);
    } catch (err) { toast({ title: 'Error', description: err.response?.data?.message, status: 'error', duration: 3000 }); }
    finally { setSaving(false); }
  };

  if (loading) return <Flex justify="center" align="center" minH="400px"><Spinner size="xl" color="teal.500" thickness="4px" /></Flex>;
  if (error) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;
  if (!user) return null;

  const getRoleColor = (r) => ({ admin: 'purple', educator: 'blue', doctor: 'orange', student: 'green' })[r] || 'gray';
  const getStatusColor = (s) => ({ active: 'green', suspended: 'red', pending: 'yellow' })[s] || 'gray';
  const daysSinceJoin = dayjs().diff(dayjs(user.createdAt), 'day');

  return (
    <Box>
      {/* Header */}
      <Flex align="center" gap={4} mb={6}>
        <IconButton icon={<FiArrowLeft />} variant="ghost" onClick={() => navigate('/admin/users')} aria-label="Back" />
        <Box>
          <Flex align="center" gap={3}>
            <Heading size="lg">{user.username}</Heading>
            <Badge colorScheme={getRoleColor(user.role)} fontSize="md" px={3} py={1}>{user.role}</Badge>
            <Badge colorScheme={getStatusColor(user.status)} fontSize="md" px={3} py={1}>{user.status}</Badge>
          </Flex>
          <Text color="gray.500" mt={1}>{user.email}</Text>
        </Box>
      </Flex>

      {/* Quick Stats Row */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box bg={accentBg} p={4} borderRadius="lg">
          <HStack spacing={3}>
            <FiCalendar size={20} color="#319795" />
            <Box><Text fontSize="xs" color={labelColor}>Member Since</Text><Text fontWeight="bold">{dayjs(user.createdAt).format('MMM D, YYYY')}</Text></Box>
          </HStack>
        </Box>
        <Box bg={useColorModeValue('blue.50', 'blue.900')} p={4} borderRadius="lg">
          <HStack spacing={3}>
            <FiClock size={20} color="#3182CE" />
            <Box><Text fontSize="xs" color={labelColor}>Days Active</Text><Text fontWeight="bold">{daysSinceJoin} days</Text></Box>
          </HStack>
        </Box>
        <Box bg={useColorModeValue('purple.50', 'purple.900')} p={4} borderRadius="lg">
          <HStack spacing={3}>
            <FiShield size={20} color="#805AD5" />
            <Box><Text fontSize="xs" color={labelColor}>Auth Method</Text><Text fontWeight="bold">{user.authProvider || 'local'}</Text></Box>
          </HStack>
        </Box>
        <Box bg={useColorModeValue(user.verified ? 'green.50' : 'red.50', user.verified ? 'green.900' : 'red.900')} p={4} borderRadius="lg">
          <HStack spacing={3}>
            {user.verified ? <FiCheckCircle size={20} color="#38A169" /> : <FiXCircle size={20} color="#E53E3E" />}
            <Box><Text fontSize="xs" color={labelColor}>Verified</Text><Text fontWeight="bold">{user.verified ? 'Verified' : 'Not Verified'}</Text></Box>
          </HStack>
        </Box>
      </SimpleGrid>

      <Tabs variant="soft-rounded" colorScheme="teal" isLazy>
        <TabList mb={6} flexWrap="wrap">
          <Tab>Overview</Tab>
          <Tab>Profile</Tab>
          <Tab>Subscription</Tab>
          {isEditMode && <Tab>Settings</Tab>}
        </TabList>

        <TabPanels>
          {/* Overview Tab */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* User Card */}
              <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
                <Flex direction="column" align="center" textAlign="center" mb={6}>
                  <Avatar size="2xl" name={user.username} bg={`${getRoleColor(user.role)}.400`} mb={4} />
                  <Heading size="md">{user.username}</Heading>
                  <Text color="gray.500">{user.email}</Text>
                  <HStack mt={3} spacing={2}>
                    <Badge colorScheme={getRoleColor(user.role)} fontSize="sm" px={3}>{user.role}</Badge>
                    <Badge colorScheme={getStatusColor(user.status)} fontSize="sm" px={3}>{user.status}</Badge>
                  </HStack>
                </Flex>
                <Divider mb={4} />
                <VStack spacing={3} align="stretch">
                  <InfoRow label="User ID" value={user._id} mono />
                  <InfoRow label="Subscription" value={user.subscriptionPlan || 'free'} badge />
                  <InfoRow label="Last Login" value={user.lastLogin ? dayjs(user.lastLogin).format('MMM D, YYYY h:mm A') : 'Never'} />
                  <InfoRow label="Created" value={dayjs(user.createdAt).format('MMM D, YYYY')} />
                  <InfoRow label="Updated" value={dayjs(user.updatedAt).format('MMM D, YYYY')} />
                </VStack>
              </Box>

              {/* Activity Placeholder / Quick Stats */}
              <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
                <Heading size="md" mb={6}>Account Summary</Heading>
                <SimpleGrid columns={2} spacing={4}>
                  <StatBox label="Status" value={user.status} color={user.status === 'active' ? 'green.500' : 'red.500'} />
                  <StatBox label="Role" value={user.role} color="#319795" />
                  <StatBox label="Auth" value={user.authProvider || 'local'} color="#805AD5" />
                  <StatBox label="Plan" value={user.subscriptionPlan || 'free'} color="#D69E2E" />
                  <StatBox label="Verified" value={user.verified ? 'Yes' : 'No'} color={user.verified ? 'green.500' : 'gray.400'} />
                </SimpleGrid>
                <Divider my={4} />
                <Text fontSize="sm" color="gray.400" mb={3}>Account Age</Text>
                <Flex align="center" gap={3}>
                  <Progress value={Math.min(daysSinceJoin, 365) / 3.65} size="lg" colorScheme="teal" borderRadius="full" flex={1} />
                  <Text fontWeight="bold" fontSize="lg">{daysSinceJoin} days</Text>
                </Flex>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  {daysSinceJoin >= 365
                    ? `Over ${Math.floor(daysSinceJoin / 365)} year${Math.floor(daysSinceJoin / 365) > 1 ? 's' : ''}!`
                    : `${365 - daysSinceJoin} days until 1 year anniversary`}
                </Text>
              </Box>
            </SimpleGrid>
          </TabPanel>

          {/* Profile Tab */}
          <TabPanel px={0}>
            {profile ? (
              <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
                <Flex align="center" gap={4} mb={6}>
                  <Avatar size="lg" name={profile.fullName} bg="teal.400" />
                  <Box>
                    <Heading size="md">{profile.fullName}</Heading>
                    <Text color="gray.500">{profile.profession}{profile.specialization ? ` — ${profile.specialization}` : ''}</Text>
                  </Box>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Box><Text fontSize="sm" color={labelColor}>Country</Text><Text fontWeight="medium">{profile.country || '—'}</Text></Box>
                  <Box><Text fontSize="sm" color={labelColor}>University</Text><Text fontWeight="medium">{profile.university || '—'}</Text></Box>
                  <Box><Text fontSize="sm" color={labelColor}>Years Experience</Text><Text fontWeight="medium">{profile.yearsExperience ?? '—'}</Text></Box>
                  <Box><Text fontSize="sm" color={labelColor}>Languages</Text><Text fontWeight="medium">{profile.languages?.length ? profile.languages.join(', ') : '—'}</Text></Box>
                </SimpleGrid>
                {profile.bio && <Box mt={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md"><Text fontSize="sm" fontStyle="italic">"{profile.bio}"</Text></Box>}
                {profile.skills?.length > 0 && (
                  <Box mt={4}><Text fontSize="sm" color={labelColor} mb={2}>Skills</Text>
                    <Wrap>{profile.skills.map((s, i) => <WrapItem key={i}><Badge colorScheme="teal" variant="subtle" px={3} py={1}>{s}</Badge></WrapItem>)}</Wrap></Box>)}
                {profile.interests?.length > 0 && (
                  <Box mt={4}><Text fontSize="sm" color={labelColor} mb={2}>Interests</Text>
                    <Wrap>{profile.interests.map((s, i) => <WrapItem key={i}><Badge colorScheme="purple" variant="subtle" px={3} py={1}>{s}</Badge></WrapItem>)}</Wrap></Box>)}
              </Box>
            ) : (
              <Box bg={cardBg} p={10} borderRadius="xl" borderWidth="1px" borderColor={borderColor} textAlign="center" color="gray.400">
                <FiUser size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <Text>No profile data available for this user</Text>
              </Box>
            )}
          </TabPanel>

          {/* Subscription Tab */}
          <TabPanel px={0}>
            <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
              <Heading size="md" mb={6}>Subscription Information</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <InfoBox icon={FiShield} label="Current Plan" value={user.subscriptionPlan || 'Free'} color="teal" />
                <InfoBox icon={FiMail} label="Auth Provider" value={user.authProvider || 'local'} color="purple" />
                <InfoBox icon={FiCalendar} label="Member Since" value={dayjs(user.createdAt).format('MMMM D, YYYY')} color="blue" />
                <InfoBox icon={FiClock} label="Last Active" value={user.lastLogin ? dayjs(user.lastLogin).format('MMM D, YYYY') : 'Never'} color="orange" />
              </SimpleGrid>
            </Box>
          </TabPanel>

          {/* Settings Tab (edit mode only) */}
          {isEditMode && (
            <TabPanel px={0}>
              <Box maxW="500px" bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
                <Heading size="md" mb={6} display="flex" alignItems="center" gap={2}><FiShield /> User Settings</Heading>
                <VStack spacing={5} align="stretch">
                  <FormControl>
                    <FormLabel>Role</FormLabel>
                    <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} size="lg">
                      <option value="student">Student</option><option value="doctor">Doctor</option>
                      <option value="educator">Educator</option><option value="admin">Admin</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Status</FormLabel>
                    <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} size="lg">
                      <option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending</option>
                    </Select>
                  </FormControl>
                  <Button colorScheme="teal" size="lg" leftIcon={<FiSave />} onClick={handleSave} isLoading={saving} w="full" mt={2}>
                    Save Changes
                  </Button>
                </VStack>
              </Box>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

const InfoRow = ({ label, value, mono, badge }) => (
  <Flex justify="space-between" align="center">
    <Text color="gray.500" fontSize="sm">{label}</Text>
    {badge ? <Badge>{value}</Badge>
      : <Text fontWeight="medium" fontSize="sm" fontFamily={mono ? 'monospace' : undefined} maxW="200px" noOfLines={1}>{value}</Text>}
  </Flex>
);

const StatBox = ({ label, value, color }) => (
  <Stat>
    <StatLabel fontSize="xs">{label}</StatLabel>
    <StatNumber fontSize="xl" color={color}>{value}</StatNumber>
  </Stat>
);

const InfoBox = ({ icon: Icon, label, value, color }) => { const c = useColorModeValue(`${color}.50`, `${color}.900`); return (
    <Flex align="center" gap={3} p={4} bg={c} borderRadius="lg">
      <Icon size={24} />
      <Box><Text fontSize="xs" color="gray.500">{label}</Text><Text fontWeight="bold">{value}</Text></Box>
    </Flex>
  );
};

export default AdminUserDetail;
