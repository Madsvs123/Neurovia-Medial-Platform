import React from 'react';
import { Box, Heading, Text, Button, useColorModeValue, Icon, Flex, Badge, HStack, Divider } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiHeart, FiLock } from 'react-icons/fi';

const ClinicalCaseCard = ({ clinicalCase, index = 0 }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ y: -3 }}
    >
      <Link to={`/clinical-cases/${clinicalCase._id}`} style={{ textDecoration: 'none' }}>
        <Box
          bg={cardBg}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
          transition="all 0.2s"
          _hover={{ shadow: 'md', borderColor: 'pink.400' }}
          h="full"
          display="flex"
          flexDirection="column"
        >
          {/* Gradient header */}
          <Box
            h="90px"
            bgGradient={`linear(135deg, #2196F3 0%, #1565C0 100%)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <Icon as={FiHeart} boxSize={9} color="white" opacity={0.25} />
            {clinicalCase.specialty && (
              <Badge
                position="absolute" bottom={3} left={3}
                colorScheme="whiteAlpha" variant="solid"
                fontSize="2xs" px={2} py={0.5} borderRadius="full"
              >
                {clinicalCase.specialty}
              </Badge>
            )}
          </Box>

          <Box p={4} flex="1" display="flex" flexDirection="column">
            {/* Title */}
            <Heading size="sm" noOfLines={2} mb={2}>{clinicalCase.title}</Heading>

            {/* Diagnosis */}
            {clinicalCase.diagnosis && (
              <Text fontSize="xs" fontWeight="semibold" color="blue.600" noOfLines={1} mb={2}>
                {clinicalCase.diagnosis}
              </Text>
            )}

            {/* Description */}
            {clinicalCase.description && (
              <Text fontSize="xs" color={mutedColor} noOfLines={2} mb={3}>
                {clinicalCase.description}
              </Text>
            )}

            <Box flex="1" />

            {/* Tags + CTA */}
            <Flex align="center" justify="space-between" pt={3} borderTopWidth="1px" borderColor={borderColor}>
              <Flex gap={1.5} flexWrap="wrap">
                {clinicalCase.premiumOnly && (
                  <Badge colorScheme="orange" variant="subtle" fontSize="2xs" borderRadius="full" px={2}>
                    <HStack spacing={0.5}><FiLock size={10} /><Text>Premium</Text></HStack>
                  </Badge>
                )}
              </Flex>
              <Button size="xs" variant="ghost" colorScheme="blue" rightIcon={<FiArrowRight size={12} />}>
                View Case
              </Button>
            </Flex>
          </Box>
        </Box>
      </Link>
    </motion.div>
  );
};

export default ClinicalCaseCard;
