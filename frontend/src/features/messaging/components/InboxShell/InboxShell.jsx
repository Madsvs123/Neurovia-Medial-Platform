import React from 'react';
import { Box, Flex, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';

/**
 * Three-pane inbox layout:  [boxes] | [thread list] | [thread + sidebar]
 *
 * Responsive behaviour:
 *  - ≥ lg: all panes side by side
 *  - md:   boxes collapse into the list pane's top tabs, list + thread side by side
 *  - base: single pane — list OR thread, whichever is active (mobile "drill-in")
 */
const InboxShell = ({ nav, list, thread, hasThread = false }) => {
  const border = useColorModeValue('gray.200', 'gray.700');
  const bg = useColorModeValue('white', 'gray.800');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const showNavPane = useBreakpointValue({ base: false, lg: true });

  return (
    <Flex
      h={{ base: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' }}
      minH="480px"
      borderWidth="1px"
      borderColor={border}
      borderRadius="xl"
      overflow="hidden"
      bg={bg}
      boxShadow="sm"
    >
      {showNavPane && (
        <Box w="210px" flexShrink={0} borderRightWidth="1px" borderColor={border} py={3} px={2} overflowY="auto">
          {nav}
        </Box>
      )}

      {(!isMobile || !hasThread) && (
        <Flex direction="column" w={{ base: '100%', md: '340px', xl: '380px' }} flexShrink={0} borderRightWidth={{ base: 0, md: '1px' }} borderColor={border} minH={0}>
          {!showNavPane && <Box borderBottomWidth="1px" borderColor={border} overflowX="auto">{React.cloneElement(nav, { compact: true })}</Box>}
          {list}
        </Flex>
      )}

      {(!isMobile || hasThread) && (
        <Box flex={1} minW={0} minH={0}>
          {thread}
        </Box>
      )}
    </Flex>
  );
};

export default InboxShell;
