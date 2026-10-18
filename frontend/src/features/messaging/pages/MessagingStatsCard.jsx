import React from 'react';
import { Box, Flex, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber, Badge, Button, Spinner, HStack, useColorModeValue } from '@chakra-ui/react';
import { FiMessageSquare, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMessagingStats } from '../hooks/useMessaging';
import { TEAM_COLOR } from '../model/meta';

/** Admin dashboard widget — open work by team, unassigned, SLA, first response. */
const MessagingStatsCard = () => {
  const { t } = useTranslation('messaging');
  const navigate = useNavigate();
  const { data, isLoading } = useMessagingStats();
  const bg = useColorModeValue('white', 'gray.800');

  return (
    <Box bg={bg} borderRadius="xl" boxShadow="sm" p={5} borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
      <Flex justify="space-between" align="center" mb={4}>
        <HStack><FiMessageSquare /><Heading size="sm">{t('stats.title')}</Heading></HStack>
        <Button size="xs" variant="outline" onClick={() => navigate('/admin/messages?box=queue')}>{t('stats.viewQueue')}</Button>
      </Flex>

      {isLoading ? <Spinner size="sm" /> : !data ? <Text fontSize="sm" color="gray.500">{t('stats.noData')}</Text> : (
        <>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} mb={4}>
            <Stat size="sm">
              <StatLabel>{t('stats.unassigned')}</StatLabel>
              <StatNumber color={data.unassigned ? 'orange.500' : undefined}>{data.unassigned}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>{t('stats.slaBreaches')}</StatLabel>
              <StatNumber color={data.slaBreaches ? 'red.500' : undefined}>
                <HStack spacing={1}>{data.slaBreaches > 0 && <FiAlertTriangle size={16} />}<span>{data.slaBreaches}</span></HStack>
              </StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel>{t('stats.medianFirstResponse')}</StatLabel>
              <StatNumber>{data.firstResponse?.medianMinutes != null ? t('stats.minutes', { count: data.firstResponse.medianMinutes }) : '—'}</StatNumber>
            </Stat>
          </SimpleGrid>

          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500" mb={2}>{t('stats.openByTeam')}</Text>
          <HStack spacing={2} flexWrap="wrap">
            {Object.entries(data.openByTeam || {}).map(([team, n]) => (
              <Badge key={team} colorScheme={TEAM_COLOR[team] || 'gray'} borderRadius="full" px={3} py={1} cursor="pointer" onClick={() => navigate(`/admin/messages?box=team-${team}`)}>
                {t(`team.${team}`, { defaultValue: team })}: {n}
              </Badge>
            ))}
          </HStack>
        </>
      )}
    </Box>
  );
};

export default MessagingStatsCard;
