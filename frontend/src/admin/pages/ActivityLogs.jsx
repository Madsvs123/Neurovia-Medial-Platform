import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Spinner, Alert, AlertIcon, Input, InputGroup,
  InputLeftElement, Select, IconButton, useColorModeValue,
  Tooltip, useToast, SimpleGrid, Stat, StatLabel, StatNumber,
  StatHelpText, HStack, Button,
} from '@chakra-ui/react';
import { FiSearch, FiRefreshCw, FiUsers, FiActivity, FiCalendar } from 'react-icons/fi';
import { getRecentActivityLogs, getActivityStats } from '../services/api';
import dayjs from 'dayjs';

const ActivityLogs = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  const actionColor = (a) => {
    const colors = { login: 'blue', view_course: 'green', start_quiz: 'orange', complete_quiz: 'purple', complete_lesson: 'teal', view_clinical_case: 'pink', study_flashcard: 'yellow', update_profile: 'gray', view_program: 'red' };
    return colors[a] || 'gray';
  };

  useEffect(() => { fetchAll(); }, [timeRange]);

  const fetchAll = async () => {
    try { setLoading(true); setError(null);
      const [logRes, statsRes] = await Promise.all([
        getRecentActivityLogs({ limit: 100, hours: timeRange }),
        getActivityStats({ timeRange: timeRange === '24' ? '1' : timeRange === '168' ? '7' : '30' }).catch(() => ({ data: { stats: null } })),
      ]);
      setLogs(logRes.data.activityLogs || []);
      setStats(statsRes.data.stats || null);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  const filtered = logs.filter((l) => {
    const matchSearch = l.userId?.username?.toLowerCase().includes(search.toLowerCase()) ||
      l.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceType?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  if (error && !loading) return <Alert status="error" borderRadius="md"><AlertIcon /> {error}</Alert>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box><Heading size="lg">Activity Logs</Heading><Text color="gray.500" mt={1}>{logs.length} recent activities</Text></Box>
        <HStack spacing={3}>
          <Tooltip label="Refresh" hasArrow><IconButton icon={<FiRefreshCw />} variant="ghost" onClick={fetchAll} aria-label="Refresh" /></Tooltip>
        </HStack>
      </Flex>

      {/* Stats */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Total Activities</StatLabel><StatNumber>{stats.totalActivities || 0}</StatNumber>
              <StatHelpText>in {stats.timeRange || `${timeRange}h`}</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Top Action</StatLabel><StatNumber fontSize="md">{stats.activityTypes?.[0]?._id || '—'}</StatNumber>
              <StatHelpText>{stats.activityTypes?.[0]?.count || 0} times</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Top Resource</StatLabel><StatNumber fontSize="md">{stats.resourceTypes?.[0]?._id || '—'}</StatNumber>
              <StatHelpText>{stats.resourceTypes?.[0]?.count || 0}</StatHelpText></Stat>
          </Box>
          <Box bg={cardBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
            <Stat size="sm"><StatLabel>Activity Types</StatLabel><StatNumber>{stats.activityTypes?.length || 0}</StatNumber></Stat>
          </Box>
        </SimpleGrid>
      )}

      {/* Filters */}
      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
        <InputGroup maxW={{ base: 'full', md: '300px' }}>
          <InputLeftElement><FiSearch color="gray.400" /></InputLeftElement>
          <Input placeholder="Search by user, action, resource..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} maxW="180px">
          <option value="all">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </Select>
        <HStack spacing={2}>
          <Button size="sm" variant={timeRange === '24' ? 'solid' : 'outline'} colorScheme="teal"
            onClick={() => setTimeRange('24')}>24h</Button>
          <Button size="sm" variant={timeRange === '168' ? 'solid' : 'outline'} colorScheme="teal"
            onClick={() => setTimeRange('168')}>7d</Button>
          <Button size="sm" variant={timeRange === '720' ? 'solid' : 'outline'} colorScheme="teal"
            onClick={() => setTimeRange('720')}>30d</Button>
        </HStack>
      </Flex>

      {loading ? <Flex justify="center" py={20}><Spinner size="xl" color="teal.500" /></Flex>
        : <Box bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={borderColor} overflow="hidden" shadow="sm">
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr><Th>User</Th><Th>Action</Th><Th>Resource</Th><Th>Device</Th><Th>IP</Th><Th>Timestamp</Th></Tr>
                </Thead>
                <Tbody>
                  {filtered.length === 0
                    ? <Tr><Td colSpan={6} textAlign="center" py={10} color="gray.400">No activity logs</Td></Tr>
                    : filtered.map((log) => (
                        <Tr key={log._id} _hover={{ bg: rowHover }}>
                          <Td>
                            <Text fontWeight="medium" fontSize="sm">{log.userId?.username || '—'}</Text>
                            <Text fontSize="xs" color="gray.400">{log.userId?.email || ''}</Text>
                          </Td>
                          <Td>
                            <Badge colorScheme={actionColor(log.action)} fontSize="xs">
                              {log.action?.replace(/_/g, ' ')}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="sm">{log.resourceType || '—'}</Text>
                            {log.resourceId && <Text fontSize="xs" color="gray.400">{log.resourceId.toString().slice(0, 12)}...</Text>}
                          </Td>
                          <Td><Text fontSize="xs" maxW="120px" noOfLines={1}>{log.deviceInfo || '—'}</Text></Td>
                          <Td><Text fontSize="xs" fontFamily="monospace">{log.ipAddress || '—'}</Text></Td>
                          <Td><Text fontSize="xs">{dayjs(log.createdAt).format('MMM D, h:mm A')}</Text></Td>
                        </Tr>
                      ))}
                </Tbody>
              </Table>
            </Box>
          </Box>}
    </Box>
  );
};

export default ActivityLogs;
