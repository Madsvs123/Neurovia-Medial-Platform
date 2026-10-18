import React from 'react';
import { Badge, Avatar, Text, Tooltip } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  STATUS_COLOR, PRIORITY_COLOR, KIND_COLOR, TEAM_COLOR, ROLE_COLOR, statusLabelKey, displayName,
} from '../../model/meta';

dayjs.extend(relativeTime);

const pill = { borderRadius: 'full', px: 2, py: 0.5, fontSize: 'xs', textTransform: 'none', fontWeight: 'semibold' };

export const StatusBadge = ({ status, isStaff = true, isRequester = false, ...rest }) => {
  const { t } = useTranslation('messaging');
  if (!status) return null;
  return (
    <Badge colorScheme={STATUS_COLOR[status] || 'gray'} {...pill} {...rest}>
      {t(statusLabelKey(status, { isStaff, isRequester }))}
    </Badge>
  );
};

export const PriorityBadge = ({ priority, ...rest }) => {
  const { t } = useTranslation('messaging');
  if (!priority || priority === 'normal') return null;
  return (
    <Badge colorScheme={PRIORITY_COLOR[priority]} variant="solid" {...pill} {...rest}>
      {t(`priority.${priority}`)}
    </Badge>
  );
};

export const KindBadge = ({ kind, ...rest }) => {
  const { t } = useTranslation('messaging');
  if (!kind) return null;
  return (
    <Badge colorScheme={KIND_COLOR[kind]} variant="subtle" {...pill} {...rest}>
      {t(`kind.${kind}`)}
    </Badge>
  );
};

export const TeamBadge = ({ team, ...rest }) => {
  const { t } = useTranslation('messaging');
  if (!team) return null;
  return (
    <Badge colorScheme={TEAM_COLOR[team] || 'gray'} variant="outline" {...pill} {...rest}>
      {t(`team.${team}`)}
    </Badge>
  );
};

export const RoleBadge = ({ role, ...rest }) => {
  if (!role) return null;
  return (
    <Badge colorScheme={ROLE_COLOR[role] || 'gray'} variant="subtle" {...pill} {...rest}>
      {role}
    </Badge>
  );
};

export const UserAvatar = ({ user, size = 'sm', ...rest }) => (
  <Avatar
    name={displayName(user)}
    src={user?.avatar || undefined}
    size={size}
    bg={`${ROLE_COLOR[user?.role] || 'gray'}.500`}
    color="white"
    {...rest}
  />
);

export const RelativeTime = ({ date, ...rest }) => {
  if (!date) return null;
  const d = dayjs(date);
  return (
    <Tooltip label={d.format('MMM D, YYYY h:mm A')} hasArrow openDelay={400}>
      <Text as="time" dateTime={d.toISOString()} fontSize="xs" color="gray.500" {...rest}>
        {d.fromNow()}
      </Text>
    </Tooltip>
  );
};
