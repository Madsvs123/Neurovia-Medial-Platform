import React from 'react';
import { Box, Flex, Heading, Text, SimpleGrid, HStack, Badge, Spinner, Button, useColorModeValue, Icon } from '@chakra-ui/react';
import { FiMessageSquare, FiAlertTriangle, FiClock, FiArrowRight } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMessagingStats } from '../hooks';
import { TEAM_COLOR } from '../model/meta';

/** Admin dashboard widget: open by team, median first response, SLA breaches. */
const MessagingStatsCard = ({ linkTo = '/admin/messages?box=queue' }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useMessagingStats();
  const bg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" p={5} boxShadow="sm">
      <Flex justify="space-between" align="center" mb={4}>
        <HStack><Icon as={FiMessageSquare} color="teal.500" /><Heading size="sm">{t('stats.title')}</Heading></HStack>
        <Button as={RouterLink} to={linkTo} size="xs" variant="ghost" rightIcon={<FiArrowRight />}>{t('boxes.queue')}</Button>
      </Flex>
      {isLoading || !data ? <Spinner size="sm" color="teal.500" /> : (
        <>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>
            <Box><Text fontSize="xs" color="gray.500">{t('stats.opened30d')}</Text><Text fontSize="2xl" fontWeight="bold">{data.opened30d}</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">{t('stats.resolved30d')}</Text><Text fontSize="2xl" fontWeight="bold">{data.resolved30d}</Text></Box>
            <Box><HStack spacing={1} fontSize="xs" color="gray.500"><Icon as={FiClock} /><Text>{t('stats.median')}</Text></HStack><Text fontSize="2xl" fontWeight="bold">{data.medianFirstResponseHours == null ? '—' : t('stats.hours', { count: data.medianFirstResponseHours })}</Text></Box>
            <Box><HStack spacing={1} fontSize="xs" color={data.slaBreaches ? 'red.500' : 'gray.500'}><Icon as={FiAlertTriangle} /><Text>{t('stats.breaches')}</Text></HStack><Text fontSize="2xl" fontWeight="bold" color={data.slaBreaches ? 'red.500' : undefined}>{data.slaBreaches}</Text></Box>
          </SimpleGrid>
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2}>{t('stats.openByTeam')}</Text>
          <HStack spacing={2} flexWrap="wrap">
            {data.byTeam.length === 0 && <Text fontSize="sm" color="gray.500">—</Text>}
            {data.byTeam.map((row) => (
              <Badge key={row.team || 'none'} colorScheme={TEAM_COLOR[row.team] || 'gray'} borderRadius="md" px={2} py={1} textTransform="none">
                {t(`team.${row.team || 'support'}`)}: {row.count}{row.unassigned ? ` (${row.unassigned} ${t('stats.unassigned')})` : ''}
              </Badge>
            ))}
          </HStack>
        </>
      )}
    </Box>
  );
};

export default MessagingStatsCard;
