import React from 'react';
import { Badge } from '@chakra-ui/react';
import { getStatusMeta } from './conversationStatus';

/**
 * The one status badge used everywhere a conversation status appears.
 */
const ConversationStatusBadge = ({ status, fontSize = 'xs', ...rest }) => {
    const meta = getStatusMeta(status);
    return (
        <Badge
            colorScheme={meta.colorScheme}
            fontSize={fontSize}
            px={2}
            py={0.5}
            borderRadius="full"
            flexShrink={0}
            {...rest}
        >
            {meta.label}
        </Badge>
    );
};

export default ConversationStatusBadge;
