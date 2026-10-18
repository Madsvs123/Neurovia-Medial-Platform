import React from 'react';
import {
  Box, Heading, Text, Button, Image, useColorModeValue,
  Icon, Flex, Badge, Progress, HStack,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight, FiUsers, FiBookOpen, FiEdit2,
  FiCalendar, FiCheckCircle, FiAward,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { CARD_PRESETS } from '../theme';

// ─── Constants ────────────────────────────────────────────────────────
const CARD_COLOR_SCHEME = 'primary';

// ─── Helpers ──────────────────────────────────────────────────────────
const getStatusBadge = (expiresAt, maxUsers, currentUsers, active) => {
  if (!active) return { label: 'Inactive', colorScheme: 'gray' };
  if (expiresAt && new Date(expiresAt) < new Date()) return { label: 'Expired', colorScheme: 'error' };
  if (maxUsers && currentUsers >= maxUsers) return { label: 'Full', colorScheme: 'error' };
  return null;
};

const getProgramTypeLabel = (programType) => {
  const map = {
    free_access: 'Free Access',
    discount_access: 'Discount',
    quiz_bundle: 'Quiz Bundle',
    clinical_cases_bundle: 'Clinical Cases',
    premium_unlock: 'Premium',
  };
  return map[String(programType || '').toLowerCase()] || 'Program';
};

// ─── Component ────────────────────────────────────────────────────────
const ProgramCard = ({ program, enrolled = false, owned = false }) => {
  const { user } = useAuth();

  // Derived data
  const programImage = program.thumbnail || program.image || program.imageUrl || '';
  const usagePercent = program.maxUsers
    ? Math.min(Math.round((program.currentUsers / program.maxUsers) * 100), 100)
    : 0;
  const isExpired = program.expiresAt && new Date(program.expiresAt) < new Date();
  const isFull = program.maxUsers && program.currentUsers >= program.maxUsers;
  const statusBadge = getStatusBadge(program.expiresAt, program.maxUsers, program.currentUsers, program.active);
  const typeLabel = getProgramTypeLabel(program.programType);

  // Ownership
  const ownerId = program.owner?._id || (typeof program.owner === 'object' ? program.owner._id : program.owner);
  // Handle both `user.id` (from backend response) and `user._id` (from Mongoose populate)
  const currentUserId = user?.id || user?._id;
  const isProgramOwner = owned || (user && currentUserId && (
    (ownerId && ownerId.toString() === currentUserId.toString()) ||
    (program.createdBy && program.createdBy.toString() === currentUserId.toString())
  ));
  const isEducatorOwner = isProgramOwner && user?.role === 'educator';
  const isEnrolled = enrolled && !isProgramOwner;

  // Colours
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const primaryBg = useColorModeValue(`${CARD_COLOR_SCHEME}.50`, `${CARD_COLOR_SCHEME}.900`);
  const primaryColor = useColorModeValue(`${CARD_COLOR_SCHEME}.500`, `${CARD_COLOR_SCHEME}.300`);

  // Enrolled card: green all around — distinct card
  const enrolledBg = useColorModeValue('success.50', 'success.900');
  const enrolledBorderColor = useColorModeValue('success.300', 'success.600');
  const enrolledAccent = useColorModeValue('success.500', 'success.400');

  // ─── Image side ────────────────────────────────────────────────
  const imageSide = (
    <Box
      w={{ base: 'full', md: '160px', lg: '150px', xl: '160px' }}
      h={{ base: '120px', md: 'full' }}
      bg={primaryBg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
      flexShrink={0}
    >
      {programImage ? (
        <Image
          src={programImage}
          alt={program.title}
          objectFit="cover"
          w="full"
          h="full"
        />
      ) : (
        <Icon as={FiBookOpen} boxSize={10} color={primaryColor} opacity={0.7} />
      )}

      {/* Enrolled badge — top-left on image */}
      {isEnrolled && (
        <Flex
          position="absolute"
          top={2}
          left={2}
          bg="success.500"
          color="white"
          px={2}
          py={0.5}
          borderRadius="full"
          align="center"
          gap={1}
          fontSize="2xs"
          fontWeight="bold"
          zIndex={2}
        >
          <Icon as={FiCheckCircle} boxSize={3} />
          <Text>Enrolled</Text>
        </Flex>
      )}

      {/* Owner badge — top-right on image */}
      {isProgramOwner && !isEnrolled && (
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorScheme="purple"
          variant="solid"
          fontSize="2xs"
          px={2}
          py={0.5}
        >
          Owner
        </Badge>
      )}
    </Box>
  );

  // ─── Main Card ────────────────────────────────────────────────
  const cardContent = (
    <Box
      bg={isEnrolled ? enrolledBg : cardBg}
      borderRadius="xl"
      borderWidth={isEnrolled ? '2px' : '1px'}
      borderColor={isEnrolled ? enrolledBorderColor : borderColor}
      overflow="hidden"
      transition={CARD_PRESETS.base.transition}
      _hover={{
        transform: CARD_PRESETS.base._hover.transform,
        boxShadow: 'card-hover',
        borderColor: isEnrolled
          ? useColorModeValue('success.500', 'success.400')
          : useColorModeValue('gray.300', 'gray.600'),
      }}
      h="full"
      display="flex"
      flexDirection={{ base: 'column', md: 'row' }}
      position="relative"
    >
      {/* Accent bar — green for enrolled, primary for others */}
      <Box
        h="4px"
        bg={isEnrolled ? enrolledAccent : primaryColor}
      />

      {/* Image side */}
      {imageSide}

      {/* Content side */}
      <Box p={4} flex="1" display="flex" flexDirection="column" minW={0}>
        {/* Badge row */}
        <Flex justify="space-between" align="center" mb={2}>
          <Badge colorScheme={isEnrolled ? 'success' : 'gray'} variant="subtle" fontSize="2xs" px={2} py={0.5}>
            {typeLabel}
          </Badge>
          {statusBadge && (
            <Badge colorScheme={statusBadge.colorScheme} variant="subtle" fontSize="2xs">
              {statusBadge.label}
            </Badge>
          )}
        </Flex>

        {/* Title + Code */}
        <Heading size="sm" noOfLines={2} mb={0.5}>
          {program.title}
        </Heading>
        {program.code && (
          <Text fontSize="2xs" color={mutedColor} fontFamily="mono" mb={1}>
            {program.code}
          </Text>
        )}

        {/* Description */}
        {program.description && (
          <Text fontSize="sm" color={mutedColor} noOfLines={2} mb={2}>
            {program.description}
          </Text>
        )}

        {/* Meta badges */}
        <Flex wrap="wrap" gap={1.5} mb={2}>
          {program.discountPercentage > 0 && (
            <Badge colorScheme="success" variant="subtle" fontSize="xs" px={2} py={0.5}>
              {program.discountPercentage}% off
            </Badge>
          )}
          {program.expiresAt && !isExpired && program.active && (
            <Badge colorScheme="gray" variant="subtle" fontSize="xs" px={2} py={0.5}>
              <HStack spacing={1}>
                <Icon as={FiCalendar} boxSize={2.5} />
                <Text>{new Date(program.expiresAt).toLocaleDateString()}</Text>
              </HStack>
            </Badge>
          )}
        </Flex>

        {/* Capacity progress */}
        {program.maxUsers > 0 && (
          <Box mb={2}>
            <Flex justify="space-between" mb={0.5}>
              <HStack spacing={1} color={mutedColor}>
                <Icon as={FiUsers} boxSize={3} />
                <Text fontSize="xs">{program.currentUsers || 0}/{program.maxUsers}</Text>
              </HStack>
            </Flex>
            <Progress
              value={usagePercent}
              size="xs"
              colorScheme={isFull ? 'error' : isEnrolled ? 'success' : CARD_COLOR_SCHEME}
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.700')}
            />
          </Box>
        )}

        {/* Spacer + CTA */}
        <Box flex="1" />
        {isEducatorOwner ? (
          <Button
            size="sm"
            colorScheme="purple"
            rightIcon={<FiEdit2 />}
            as={Link}
            to={`/educator/programs/${program._id}`}
            onClick={(e) => e.stopPropagation()}
            w="full"
          >
            Manage my program
          </Button>
        ) : (
          <Button
            size="sm"
            variant="solid"
            colorScheme={isEnrolled ? 'success' : CARD_COLOR_SCHEME}
            rightIcon={<FiArrowRight />}
            as={Link}
            to={`/programs/${program._id}`}
            onClick={(e) => e.stopPropagation()}
            w="full"
          >
            {isEnrolled ? 'Continue Learning' : 'View Details'}
          </Button>
        )}
      </Box>
    </Box>
  );

  return cardContent;
};

export default ProgramCard;
