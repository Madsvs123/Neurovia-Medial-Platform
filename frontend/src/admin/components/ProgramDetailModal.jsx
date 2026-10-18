/**
 * Program Detail Modal Component
 * Separate component for viewing program details
 */

import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, SimpleGrid, Box, Text, Badge, Divider, Stat, StatLabel, StatNumber,
  useColorModeValue
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { PROGRAM_TYPES } from '../../theme';

const ProgramDetailModal = ({ 
  isOpen, 
  onClose, 
  program
}) => {
  if (!program) return null;

  const typeColor = (t) => {
    const key = String(t || '').toLowerCase();
    return PROGRAM_TYPES[key]?.colorScheme || 'gray';
  };

  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text fontSize="lg" fontWeight="bold">{program.title}</Text>
          <Badge ml={2} colorScheme={program.active ? 'green' : 'gray'}>
            {program.active ? 'Active' : 'Inactive'}
          </Badge>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={2} spacing={4} mb={4}>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Code</Text>
              <Text fontWeight="medium">{program.code}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Type</Text>
              <Badge colorScheme={typeColor(program.programType)}>
                {program.programType.replace(/_/g, ' ')}
              </Badge>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Users</Text>
              <Text>{program.currentUsers || 0} / {program.maxUsers || '∞'}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Status</Text>
              <Badge colorScheme={program.active ? 'green' : 'gray'}>
                {program.active ? 'Active' : 'Inactive'}
              </Badge>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Discount</Text>
              <Text>{program.discountPercentage || 0}%</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Free Access</Text>
              <Text>{program.freeAccess ? 'Yes' : 'No'}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Expires</Text>
              <Text>{program.expiresAt ? dayjs(program.expiresAt).format('MMM D, YYYY') : 'Never'}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>Created</Text>
              <Text>{dayjs(program.createdAt).format('MMM D, YYYY')}</Text>
            </Box>
          </SimpleGrid>

          <Divider my={4} />

          <Box mb={4}>
            <Text fontSize="sm" color="gray.500" mb={2}>Description</Text>
            <Box p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" whiteSpace="pre-wrap">{program.description}</Text>
            </Box>
          </Box>

          <Divider my={4} />

          <Box mb={4}>
            <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.600">OWNERSHIP</Text>
            <SimpleGrid columns={2} spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>Owner Type</Text>
                <Text fontWeight="medium" color={program.ownerType === 'educator' ? 'purple.500' : 'teal.500'}>
                  {program.ownerType === 'educator' ? 'Educator' : 'Site'}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>Owner</Text>
                <Text fontWeight="medium">
                  {program.ownerType === 'educator' ? (program.owner?.username || 'Unknown') : 'Site'}
                </Text>
              </Box>
              {!program.owner || program.owner._id !== program.createdBy?._id ? (
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>Created By</Text>
                  <Text fontWeight="medium">{program.createdBy?.username || 'System'}</Text>
                </Box>
              ) : (
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>Created By</Text>
                  <Text fontWeight="medium" color="gray.400">Same as owner</Text>
                </Box>
              )}
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>Editable by Educator</Text>
                <Text fontWeight="medium">{program.isEditableByEducator ? 'Yes' : 'No'}</Text>
              </Box>
            </SimpleGrid>
          </Box>

          <Divider my={4} />

          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={3} color="gray.600">STATISTICS</Text>
            <SimpleGrid columns={2} spacing={4}>
              <Stat size="sm">
                <StatLabel>Current Users</StatLabel>
                <StatNumber>{program.currentUsers || 0}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel>Max Capacity</StatLabel>
                <StatNumber>{program.maxUsers || '∞'}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel>Discount</StatLabel>
                <StatNumber color="orange.500">{program.discountPercentage || 0}%</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel>Free Access</StatLabel>
                <StatNumber>{program.freeAccess ? 'Yes' : 'No'}</StatNumber>
              </Stat>
            </SimpleGrid>
          </Box>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProgramDetailModal;