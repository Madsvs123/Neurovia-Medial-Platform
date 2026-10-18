import React from 'react';
import { Box, Flex, Heading, Text, Tabs, TabList, TabPanels, Tab, TabPanel, useColorModeValue } from '@chakra-ui/react';
import { FiLayers, FiBookOpen, FiHelpCircle, FiZap } from 'react-icons/fi';
import Courses from '../Courses';
import Programs from '../Programs';
import Quizzes from '../Quizzes';
import Flashcards from '../Flashcards';

const Content = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}>
            <FiLayers /> Content
          </Heading>
          <Text color="gray.500" mt={1}>Manage courses, programs, quizzes and flashcards</Text>
        </Box>
      </Flex>

      <Tabs variant="soft-rounded" colorScheme="teal" isLazy>
        <TabList mb={6} flexWrap="wrap">
          <Tab><FiBookOpen style={{ marginRight: 6 }} /> Courses</Tab>
          <Tab><FiLayers style={{ marginRight: 6 }} /> Programs</Tab>
          <Tab><FiHelpCircle style={{ marginRight: 6 }} /> Quizzes</Tab>
          <Tab><FiZap style={{ marginRight: 6 }} /> Flashcards</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}><Courses /></TabPanel>
          <TabPanel px={0}><Programs /></TabPanel>
          <TabPanel px={0}><Quizzes /></TabPanel>
          <TabPanel px={0}><Flashcards /></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Content;
