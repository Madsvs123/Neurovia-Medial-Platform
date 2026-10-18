import React, { useState, useEffect } from 'react';
import { MessagingStatsCard } from '../../features/messaging';
import {
  Box, Flex, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber,
  StatHelpText, StatArrow, useColorModeValue, Spinner, Alert, AlertIcon,
  VStack, Badge, Avatar, Divider, HStack, Icon,
} from '@chakra-ui/react';
import { FiUsers, FiUserCheck, FiTrendingUp, FiActivity, FiDollarSign, FiBookOpen } from 'react-icons/fi';
import { getUsers, getSubscriptions, getPayments, getCourses } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.400', 'gray.500');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setLoading(true);
      const [uRes, sRes, pRes, cRes] = await Promise.allSettled([
        getUsers(), getSubscriptions({ limit: 500 }), getPayments({ limit: 500 }), getCourses({ limit: 100 }),
      ]);
      if (uRes.status === 'fulfilled') setUsers(uRes.value.data.users || []);
      if (sRes.status === 'fulfilled') setSubscriptions(sRes.value.data.subscriptions || []);
      if (pRes.status === 'fulfilled') setPayments(pRes.value.data.payments || []);
      if (cRes.status === 'fulfilled') setCourses(cRes.value.data.courses || []);
    } catch { /* */ } finally { setLoading(false); }
  };

  if (loading) return <Flex justify="center" align="center" minH="400px"><Spinner size="xl" color="teal.500" thickness="4px" /></Flex>;
  if (error) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  const activeUsers = users.filter((u) => u.status === 'active');
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const totalRevenue = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const publishedCourses = courses.filter((c) => c.published);

  // Role distribution for pie chart
  const roleData = [
    { name: 'Students', value: users.filter((u) => u.role === 'student').length, color: '#48BB78' },
    { name: 'Doctors', value: users.filter((u) => u.role === 'doctor').length, color: '#4299E1' },
    { name: 'Educators', value: users.filter((u) => u.role === 'educator').length, color: '#9F7AEA' },
    { name: 'Admins', value: users.filter((u) => u.role === 'admin').length, color: '#F6AD55' },
  ].filter((d) => d.value > 0);

  // Status distribution
  const statusData = [
    { name: 'Active', value: activeUsers.length, color: '#48BB78' },
    { name: 'Suspended', value: users.filter((u) => u.status === 'suspended').length, color: '#FC8181' },
    { name: 'Pending', value: users.filter((u) => u.status === 'pending').length, color: '#F6E05E' },
  ].filter((d) => d.value > 0);

  // Course level distribution
  const levelData = [
    { name: 'Beginner', value: courses.filter((c) => c.level === 'beginner').length, color: '#48BB78' },
    { name: 'Intermediate', value: courses.filter((c) => c.level === 'intermediate').length, color: '#ED8936' },
    { name: 'Advanced', value: courses.filter((c) => c.level === 'advanced').length, color: '#FC8181' },
  ].filter((d) => d.value > 0);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="lg">Dashboard</Heading>
      </Flex>
      <Text color="gray.500" mb={6}>System Overview &amp; Analytics</Text>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5} mb={8}>
        <StatCard icon={FiUsers} label="Total Users" value={users.length} sub={`${activeUsers.length} active`} bg="#319795" />
        <StatCard icon={FiBookOpen} label="Courses" value={courses.length} sub={`${publishedCourses.length} published`} bg="#3182CE" />
        <StatCard icon={FiDollarSign} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} sub={`${payments.length} transactions`} bg="#38A169" />
        <StatCard icon={FiTrendingUp} label="Subscriptions" value={subscriptions.length} sub={`${activeSubs.length} active`} bg="#805AD5" />
      </SimpleGrid>

      {/* Support / messaging health */}
      <Box mb={8}><MessagingStatsCard /></Box>

      {/* Charts Row */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* User Role Pie */}
        {roleData.length > 0 && (
          <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Heading size="sm" mb={4}>User Distribution by Role</Heading>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {roleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Course Level Bar */}
        {levelData.length > 0 && (
          <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Heading size="sm" mb={4}>Course Level Distribution</Heading>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" stroke={useColorModeValue('#E2E8F0', '#4A5568')} />
                <XAxis dataKey="name" stroke={mutedColor} fontSize={12} />
                <YAxis stroke={mutedColor} fontSize={12} allowDecimals={false} />
                <ReTooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {levelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </SimpleGrid>

      {/* Status + Recent Users Row */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* User Status Pie */}
        {statusData.length > 0 && (
          <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Heading size="sm" mb={4}>User Account Status</Heading>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80}
                  paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Recent Users */}
        <Box bg={cardBg} p={6} borderRadius="xl" borderWidth="1px" borderColor={borderColor} shadow="sm">
          <Heading size="sm" mb={4}>Recent Users</Heading>
          {users.length === 0 ? <Text color="gray.400">No users</Text>
            : <VStack spacing={2} align="stretch">
                {users.slice(0, 6).map((u) => (
                  <Flex key={u._id} align="center" gap={3} p={2} borderRadius="md" _hover={{ bg: hoverBg }}>
                    <Avatar size="sm" name={u.username} bg="teal.400" />
                    <Box flex={1}>
                      <Text fontWeight="medium" fontSize="sm">{u.username}</Text>
                      <Text fontSize="xs" color="gray.400">{u.email}</Text>
                    </Box>
                    <Badge colorScheme={u.role === 'admin' ? 'purple' : u.role === 'educator' ? 'blue' : 'green'} fontSize="xs">{u.role}</Badge>
                    <Badge colorScheme={u.status === 'active' ? 'green' : 'red'} fontSize="xs">{u.status}</Badge>
                  </Flex>
                ))}
              </VStack>}
        </Box>
      </SimpleGrid>
    </Box>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, bg }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  return (
    <Box bg={cardBg} p={5} borderRadius="xl" borderWidth="1px" borderColor={useColorModeValue('gray.200', 'gray.600')}
      shadow="sm" position="relative" overflow="hidden">
      <Flex align="center" gap={4}>
        <Box bg={bg} p={3} borderRadius="lg" boxShadow="md">
          <Icon size={22} color="white" />
        </Box>
        <Box>
          <Stat>
            <StatLabel fontSize="sm" color="gray.500">{label}</StatLabel>
            <StatNumber fontSize="2xl" fontWeight="bold">{value}</StatNumber>
            <StatHelpText mb={0} fontSize="xs">{sub}</StatHelpText>
          </Stat>
        </Box>
      </Flex>
    </Box>
  );
};

export default AdminDashboard;
