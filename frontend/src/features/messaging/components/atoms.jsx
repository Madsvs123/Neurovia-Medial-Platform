import React from 'react';
import { Badge, Avatar, HStack, Text, Tooltip, Box } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  STATUS_COLOR, KIND_COLOR, PRIORITY_COLOR, ROLE_COLOR, TEAM_COLOR, displayName, statusLabel,
} from '../model/meta';

/** Small shared building blocks used across list, thread and sidebar. */

export const StatusBadge = ({ status, asRequester = false, ...rest }) => {
  const { t } = useTranslation();
  if (!status) return null;
  return (
    <Badge colorScheme={STATUS_COLOR[status] || 'gray'} borderRadius="full" px={2} py={0.5} fontSize="xs" textTransform="none" {...rest}>
      {statusLabel(t, status, { asRequester })}
    </Badge>
  );
};

export const KindBadge = ({ kind, ...rest }) => {
  const { t } = useTranslation();
  if (!kind) return null;
  return (
    <Badge colorScheme={KIND_COLOR[kind] || 'gray'} variant="subtle" borderRadius="md" px={1.5} fontSize="2xs" textTransform="none" {...rest}>
      {t(`kinds.${kind}`)}
    </Badge>
  );
};

export const PriorityBadge = ({ priority, ...rest }) => {
  const { t } = useTranslation();
  if (!priority || priority === 'normal') return null;
  return (
    <Badge colorScheme={PRIORITY_COLOR[priority]} variant={priority === 'urgent' ? 'solid' : 'subtle'} borderRadius="md" px={1.5} fontSize="2xs" textTransform="none" {...rest}>
      {t(`priority.${priority}`)}
    </Badge>
  );
};

export const TeamBadge = ({ team, ...rest }) => {
  const { t } = useTranslation();
  if (!team) return null;
  return (
    <Badge colorScheme={TEAM_COLOR[team] || 'gray'} variant="outline" borderRadius="md" px={1.5} fontSize="2xs" textTransform="none" {...rest}>
      {t(`team.${team}`)}
    </Badge>
  );
};

export const RoleBadge = ({ role, ...rest }) => {
  const { t } = useTranslation();
  if (!role) return null;
  return (
    <Badge colorScheme={ROLE_COLOR[role] || 'gray'} variant="subtle" borderRadius="full" px={1.5} fontSize="2xs" textTransform="none" {...rest}>
      {t(`labels.role.${role}`)}
    </Badge>
  );
};

export const CategoryBadge = ({ category, ...rest }) => {
  const { t } = useTranslation();
  if (!category) return null;
  return (
    <Badge variant="subtle" colorScheme="gray" borderRadius="md" px={1.5} fontSize="2xs" textTransform="none" {...rest}>
      {t(`category.${category}`)}
    </Badge>
  );
};

export const UserAvatar = ({ user, size = 'sm', ...rest }) => (
  <Avatar name={displayName(user)} src={user?.avatar || undefined} size={size} bg={`${ROLE_COLOR[user?.role] || 'teal'}.500`} color="white" {...rest} />
);

export const UserChip = ({ user, showRole = true, size = 'xs' }) => {
  if (!user) return null;
  return (
    <HStack spacing={1.5} minW={0}>
      <UserAvatar user={user} size={size} />
      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{displayName(user)}</Text>
      {showRole && <RoleBadge role={user.role} />}
    </HStack>
  );
};

export const UnreadDot = ({ count }) => {
  if (!count) return null;
  return (
    <Tooltip label={`${count} unread`} hasArrow>
      <Box as="span" minW="20px" h="20px" px={1.5} borderRadius="full" bg="teal.500" color="white" fontSize="xs" fontWeight="bold" display="inline-flex" alignItems="center" justifyContent="center">
        {count > 99 ? '99+' : count}
      </Box>
    </Tooltip>
  );
};
