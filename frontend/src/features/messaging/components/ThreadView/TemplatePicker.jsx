import React, { useMemo, useState } from 'react';
import {
  Button, Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverHeader, PopoverArrow,
  Input, VStack, Box, Text, useColorModeValue,
} from '@chakra-ui/react';
import { FiFileText } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useTemplates } from '../../hooks/useMessaging';

/** Quick-reply templates (from the server, filtered by the caller's role). */
const TemplatePicker = ({ onSelect, size = 'xs' }) => {
  const { t } = useTranslation('messaging');
  const [q, setQ] = useState('');
  const { data: templates = [] } = useTemplates();
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const groups = useMemo(() => {
    const needle = q.toLowerCase();
    const filtered = templates.filter((tpl) => !needle
      || tpl.title.toLowerCase().includes(needle)
      || tpl.body.toLowerCase().includes(needle)
      || (tpl.category || '').toLowerCase().includes(needle));
    return filtered.reduce((acc, tpl) => {
      (acc[tpl.category || 'General'] = acc[tpl.category || 'General'] || []).push(tpl);
      return acc;
    }, {});
  }, [templates, q]);

  return (
    <Popover placement="top-start" isLazy>
      {({ onClose }) => (
        <>
          <PopoverTrigger>
            <Button size={size} variant="outline" leftIcon={<FiFileText />} borderRadius="md">
              {t('composer.templates')}
            </Button>
          </PopoverTrigger>
          <PopoverContent w="420px" maxW="92vw" boxShadow="xl">
            <PopoverArrow />
            <PopoverHeader py={2}>
              <Input size="sm" placeholder={t('composer.searchTemplates')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            </PopoverHeader>
            <PopoverBody maxH="320px" overflowY="auto" p={2}>
              {Object.keys(groups).length === 0 ? (
                <Text fontSize="sm" color="gray.500" p={2}>{t('composer.noTemplates')}</Text>
              ) : Object.entries(groups).map(([cat, list]) => (
                <Box key={cat} mb={2}>
                  <Text fontSize="10px" fontWeight="bold" textTransform="uppercase" color="gray.400" px={2} mb={1}>{cat}</Text>
                  <VStack align="stretch" spacing={0.5}>
                    {list.map((tpl) => (
                      <Box
                        key={tpl._id}
                        as="button"
                        type="button"
                        textAlign="left"
                        px={2}
                        py={1.5}
                        borderRadius="md"
                        _hover={{ bg: hoverBg }}
                        onClick={() => { onSelect(tpl.body); onClose(); }}
                      >
                        <Text fontSize="sm" fontWeight="semibold">{tpl.title}</Text>
                        <Text fontSize="xs" color="gray.500" noOfLines={2}>{tpl.body}</Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              ))}
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  );
};

export default TemplatePicker;
