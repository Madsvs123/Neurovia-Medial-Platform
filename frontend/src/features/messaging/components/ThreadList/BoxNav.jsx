import React from 'react';
import { Box, Button, Badge, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

/**
 * Left-most navigation of the inbox: the portal's boxes (Inbox, Queue,
 * team inboxes, …) with live counters from /threads/counts.
 */
const BoxNav = ({ boxes, activeKey, counts, onSelect, compact = false }) => {
  const { t } = useTranslation('messaging');
  const activeBg = useColorModeValue('teal.50', 'teal.900');
  const groups = boxes.reduce((acc, b) => {
    const g = b.group || 'main';
    (acc[g] = acc[g] || []).push(b);
    return acc;
  }, {});

  return (
    <VStack align="stretch" spacing={compact ? 0 : 3} role="tablist" aria-label={t('nav.messages')}>
      {Object.entries(groups).map(([group, list]) => (
        <Box key={group}>
          {group !== 'main' && !compact && (
            <Text fontSize="10px" fontWeight="bold" textTransform="uppercase" color="gray.400" px={3} mb={1}>
              {t(`boxes.${group}`, { defaultValue: group })}
            </Text>
          )}
          {list.map((b) => {
            const count = b.badge ? counts?.[b.badge] : null;
            const active = b.key === activeKey;
            return (
              <Button
                key={b.key}
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(b)}
                variant="ghost"
                size="sm"
                w="100%"
                justifyContent="space-between"
                fontWeight={active ? 'bold' : 'medium'}
                bg={active ? activeBg : 'transparent'}
                color={active ? 'teal.600' : undefined}
                borderRadius={compact ? 0 : 'md'}
                px={3}
              >
                <Text noOfLines={1}>{t(b.labelKey)}</Text>
                {count > 0 && (
                  <Badge colorScheme={b.key === 'queue' ? 'orange' : 'teal'} borderRadius="full" fontSize="10px" px={1.5}>
                    {count > 99 ? '99+' : count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </Box>
      ))}
    </VStack>
  );
};

export default BoxNav;
