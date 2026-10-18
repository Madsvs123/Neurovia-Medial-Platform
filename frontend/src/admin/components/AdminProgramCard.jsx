import React from 'react';
import {
  Box, Flex, Heading, Text, Badge, Button, IconButton,
  useColorModeValue, Avatar, Divider, Tooltip, HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye, FiToggleLeft, FiToggleRight, FiTrash2, FiUsers, FiClock,
  FiCheckCircle, FiXCircle,
} from 'react-icons/fi';
import dayjs from 'dayjs';

// ─── Helpers ──────────────────────────────────────────────────────────
const PROGRAM_TYPE_LABELS = {
  free_access: 'Free Access',
  discount_access: 'Discount',
  quiz_bundle: 'Quiz Bundle',
  clinical_cases_bundle: 'Clinical Cases',
  premium_unlock: 'Premium',
};

const getTypeLabel = (t) => PROGRAM_TYPE_LABELS[String(t || '').toLowerCase()] || 'Program';

const getOwnerName = (program) => {
  if (program.ownerType === 'educator') {
    return program.owner?.username || 'Unknown Educator';
  }
  return program.createdBy?.username || 'Site';
};

// ─── Status Badge ─────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <Badge
    colorScheme={active ? 'success' : 'gray'}
    variant="subtle"
    fontSize="2xs"
    px={2}
    py={0.5}
    display="inline-flex"
    alignItems="center"
    gap={1}
  >
    {active ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
    {active ? 'Active' : 'Inactive'}
  </Badge>
);

// ─── Component ────────────────────────────────────────────────────────
const AdminProgramCard = ({ program, onToggle, onDelete }) => {
  const navigate = useNavigate();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Box
      bg={bg}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      transition="all 0.2s"
      _hover={{
        shadow: 'md',
        transform: 'translateY(-3px)',
        borderColor: useColorModeValue('gray.300', 'gray.500'),
      }}
      display="flex"
      flexDirection="column"
      cursor="pointer"
      onClick={() => navigate(`/admin/programs/${program._id}`)}
    >
      {/* Accent bar */}
      <Box h="4px" bg={program.active !== false ? 'primary.500' : 'gray.400'} />

      <Box p={5} flex="1" display="flex" flexDirection="column">
        {/* Top: badges */}
        <Flex justify="space-between" align="center" mb={3}>
          <Badge colorScheme="gray" variant="subtle" fontSize="2xs" px={2} py={0.5}>
            {getTypeLabel(program.programType)}
          </Badge>
          <StatusBadge active={program.active !== false} />
        </Flex>

        {/* Title + Code */}
        <Heading size="sm" noOfLines={1} mb={0.5}>
          {program.title}
        </Heading>
        <Text fontSize="xs" color={mutedColor} fontFamily="mono" mb={2}>
          {program.code}
        </Text>

        {/* Description */}
        {program.description && (
          <Text fontSize="sm" color={mutedColor} noOfLines={2} mb={3}>
            {program.description}
          </Text>
        )}

        {/* Owner */}
        <Flex align="center" gap={2} mb={3}>
          <Avatar size="2xs" name={getOwnerName(program)} bg="primary.500" color="white" />
          <Text fontSize="xs" color={mutedColor}>
            <Text as="span" fontWeight="medium">{getOwnerName(program)}</Text>
            {program.ownerType === 'educator' && (
              <Badge ml={1} colorScheme="purple" variant="subtle" fontSize="2xs">Educator</Badge>
            )}
          </Text>
        </Flex>

        {/* Meta row */}
        <Flex gap={4} mb={2} fontSize="xs" color={mutedColor}>
          <Flex align="center" gap={1}>
            <FiUsers size={12} />
            <Text>{program.currentUsers || 0}{program.maxUsers ? `/${program.maxUsers}` : ''}</Text>
          </Flex>
          {program.discountPercentage > 0 && (
            <Flex align="center" gap={1} color="green.600" _dark={{ color: 'green.400' }}>
              <Text fontWeight="bold">{program.discountPercentage}%</Text>
            </Flex>
          )}
          {program.expiresAt && (
            <Flex align="center" gap={1}>
              <FiClock size={12} />
              <Text>{dayjs(program.expiresAt).format('MMM D')}</Text>
            </Flex>
          )}
        </Flex>

        <Divider my={2} />

        {/* Actions — at bottom, stopPropagation to avoid card click */}
        <Flex gap={2} mt="auto">
          <Button
            size="sm"
            variant="link"
            colorScheme="primary"
            leftIcon={<FiEye />}
            flex={1}
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/programs/${program._id}`); }}
          >
            View
          </Button>
          <Tooltip label={program.active !== false ? 'Deactivate' : 'Activate'}>
            <IconButton
              size="sm"
              variant="outline"
              colorScheme={program.active !== false ? 'orange' : 'success'}
              icon={program.active !== false ? <FiToggleLeft /> : <FiToggleRight />}
              onClick={(e) => { e.stopPropagation(); onToggle(program); }}
              aria-label={program.active !== false ? 'Deactivate' : 'Activate'}
            />
          </Tooltip>
          <Tooltip label="Delete program">
            <IconButton
              size="sm"
              variant="ghost"
              colorScheme="error"
              icon={<FiTrash2 />}
              onClick={(e) => { e.stopPropagation(); onDelete(program); }}
              aria-label="Delete"
            />
          </Tooltip>
        </Flex>
      </Box>
    </Box>
  );
};

export default AdminProgramCard;
