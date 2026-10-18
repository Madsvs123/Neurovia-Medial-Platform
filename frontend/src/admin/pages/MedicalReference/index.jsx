import React, { useState } from 'react';
import { Box, Heading, Text, Tabs, TabList, TabPanels, Tab, TabPanel, useColorModeValue } from '@chakra-ui/react';
import { FiBook } from 'react-icons/fi';
import DiseasesPanel from './DiseasesPanel';
import MedicationsPanel from './MedicationsPanel';
import SymptomsPanel from './SymptomsPanel';

const MedicalReference = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box>
      <Heading size="lg" display="flex" alignItems="center" gap={3} mb={1}>
        <FiBook /> Medical Reference
      </Heading>
      <Text color="gray.500" mb={6}>
        Comprehensive clinical reference — diseases (ICD-10), medications, and symptoms database
      </Text>

      <Tabs variant="soft-rounded" colorScheme="teal" index={tabIndex} onChange={setTabIndex} isLazy>
        <TabList mb={6} flexWrap="wrap">
          <Tab>🏥 Diseases</Tab>
          <Tab>💊 Medications</Tab>
          <Tab>🔬 Symptoms</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}><DiseasesPanel cardBg={cardBg} borderColor={borderColor} /></TabPanel>
          <TabPanel px={0}><MedicationsPanel cardBg={cardBg} borderColor={borderColor} /></TabPanel>
          <TabPanel px={0}><SymptomsPanel cardBg={cardBg} borderColor={borderColor} /></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default MedicalReference;
