import React from 'react';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';

const PageHeader = ({ icon: Icon, title, subtitle, children }) => (
  <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
    <Box>
      <Heading size="lg" display="flex" alignItems="center" gap={2}>
        {Icon && <Icon />} {title}
      </Heading>
      {subtitle && <Text color="gray.500" mt={1}>{subtitle}</Text>}
    </Box>
    {children && <Flex gap={3}>{children}</Flex>}
  </Flex>
);

export default PageHeader;
