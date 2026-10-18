import React from 'react';
import { Box, Flex, Stat, StatLabel, StatNumber, StatHelpText, useColorModeValue } from '@chakra-ui/react';
import { CARD_PRESETS } from '../../../theme';

const StatCard = ({ icon: Icon, label, value, sub, bg }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const iconBg = bg || 'primary.500';

  return (
    <Box
      bg={cardBg}
      p={5}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="card"
      position="relative"
      overflow="hidden"
    >
      <Flex align="center" gap={4}>
        <Box bg={iconBg} p={3} borderRadius="lg" boxShadow="md" color="white">
          {Icon && <Icon size={22} />}
        </Box>
        <Box>
          <Stat>
            <StatLabel fontSize="sm" color="gray.500">
              {label}
            </StatLabel>
            <StatNumber fontSize="2xl" fontWeight="bold">
              {value}
            </StatNumber>
            {sub && <StatHelpText mb={0} fontSize="xs">{sub}</StatHelpText>}
          </Stat>
        </Box>
      </Flex>
    </Box>
  );
};

export default StatCard;
export { StatCard };
