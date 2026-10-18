import React from 'react';
import { Box, Flex, Heading, Text, Tabs, TabList, TabPanels, Tab, TabPanel, useColorModeValue } from '@chakra-ui/react';
import { FiCreditCard, FiClock, FiDollarSign } from 'react-icons/fi';
import PlansTab from './PlansTab';
import SubscriptionsTab from './SubscriptionsTab';
import PaymentsTab from './PaymentsTab';

const Billing = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.700');
  const rowHover = useColorModeValue('gray.50', 'gray.700');

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}>
            <FiDollarSign /> Billing
          </Heading>
          <Text color="gray.500" mt={1}>Manage subscription plans, user subscriptions, and payment transactions</Text>
        </Box>
      </Flex>

      <Tabs variant="soft-rounded" colorScheme="teal" isLazy>
        <TabList mb={6} flexWrap="wrap">
          <Tab><FiCreditCard style={{ marginRight: 6 }} /> Plans</Tab>
          <Tab><FiClock style={{ marginRight: 6 }} /> Subscriptions</Tab>
          <Tab><FiDollarSign style={{ marginRight: 6 }} /> Payments</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}><PlansTab cardBg={cardBg} borderColor={borderColor} theadBg={theadBg} rowHover={rowHover} /></TabPanel>
          <TabPanel px={0}><SubscriptionsTab cardBg={cardBg} borderColor={borderColor} theadBg={theadBg} rowHover={rowHover} /></TabPanel>
          <TabPanel px={0}><PaymentsTab cardBg={cardBg} borderColor={borderColor} theadBg={theadBg} rowHover={rowHover} /></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export { PlansTab, SubscriptionsTab, PaymentsTab };
export default Billing;
