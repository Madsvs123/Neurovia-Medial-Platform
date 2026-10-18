import React, { useEffect, useState } from 'react';
import {
  Box, Flex, Heading, Text, Button, SimpleGrid, Select, Checkbox, CheckboxGroup, HStack, VStack, Input, Textarea, IconButton,
  Table, Thead, Tbody, Tr, Th, Td, NumberInput, NumberInputField, Spinner, Alert, AlertIcon, useColorModeValue, Tabs, TabList, Tab, TabPanels, TabPanel, Badge, Switch, Tooltip,
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiRotateCcw, FiDownload } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMessagingSettings, useUpdateSettings, useTemplates, useTemplateMutations } from '../hooks';

const STAFF = ['admin', 'educator'];

/** Admin: routing rules, SLA targets and quick-reply template CRUD. */
const MessagingSettingsPage = ({ backPath = '/admin/messages' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useMessagingSettings();
  const update = useUpdateSettings();
  const { data: templates = [], isLoading: tplLoading } = useTemplates({ all: true });
  const tpl = useTemplateMutations();
  const [routing, setRouting] = useState(null);
  const [sla, setSla] = useState(null);
  const [draft, setDraft] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => { if (data && !routing) { setRouting(JSON.parse(JSON.stringify(data.routing))); setSla(JSON.parse(JSON.stringify(data.sla))); } }, [data, routing]);

  if (isLoading || !routing) return <Flex justify="center" py={16}><Spinner color="teal.500" /></Flex>;
  if (error) return <Alert status="error"><AlertIcon />{error.message}</Alert>;

  const setRule = (kind, cat, patch) => setRouting((r) => ({ ...r, [kind]: { ...r[kind], [cat]: { ...r[kind][cat], ...patch } } }));
  const rows = (kind) => Object.entries(routing[kind] || {});

  return (
    <Box>
      <Flex align="center" gap={3} mb={5}>
        <IconButton icon={<FiArrowLeft />} variant="ghost" aria-label={t('actions.back')} onClick={() => navigate(backPath)} />
        <Heading size="lg">{t('settings.title')}</Heading>
      </Flex>

      <Tabs colorScheme="teal" variant="enclosed">
        <TabList><Tab>{t('settings.routing')}</Tab><Tab>{t('settings.sla')}</Tab><Tab>{t('settings.templates')}</Tab></TabList>
        <TabPanels>
          {/* Routing */}
          <TabPanel px={0}>
            <Text fontSize="sm" color="gray.500" mb={3}>{t('settings.routingHint')}</Text>
            {['support', 'internal'].map((kind) => (
              <Box key={kind} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="lg" p={4} mb={4}>
                <Heading size="sm" mb={3} textTransform="capitalize">{t(`kinds.${kind}`)}</Heading>
                <Table size="sm">
                  <Thead><Tr><Th>{t('labels.category')}</Th><Th>{t('labels.team')}</Th><Th>{t('settings.roles')}</Th><Th>Program-scoped</Th></Tr></Thead>
                  <Tbody>
                    {rows(kind).map(([cat, rule]) => (
                      <Tr key={cat}>
                        <Td><Badge textTransform="none">{cat === '*' ? 'any' : t(`category.${cat}`)}</Badge></Td>
                        <Td>
                          <Select size="xs" value={rule.team} onChange={(e) => setRule(kind, cat, { team: e.target.value })} w="auto">
                            {(data.teams || []).map((tm) => <option key={tm} value={tm}>{t(`team.${tm}`)}</option>)}
                          </Select>
                        </Td>
                        <Td>
                          <CheckboxGroup value={rule.roles || []} onChange={(roles) => setRule(kind, cat, { roles })}>
                            <HStack>{STAFF.map((r) => <Checkbox key={r} value={r} size="sm">{t(`labels.role.${r}`)}</Checkbox>)}</HStack>
                          </CheckboxGroup>
                        </Td>
                        <Td>
                          <Tooltip label="Prefer the educators of the program in the thread's context" hasArrow>
                            <Switch size="sm" isChecked={rule.preferEducatorsOf === 'context.programId'} onChange={(e) => setRule(kind, cat, { preferEducatorsOf: e.target.checked ? 'context.programId' : undefined })} />
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ))}
            <HStack>
              <Button leftIcon={<FiSave />} colorScheme="teal" isLoading={update.isPending} onClick={() => update.mutate({ routing })}>{t('actions.save')}</Button>
              <Button leftIcon={<FiRotateCcw />} variant="ghost" onClick={() => setRouting(JSON.parse(JSON.stringify(data.defaults.routing)))}>{t('settings.resetDefaults')}</Button>
            </HStack>
          </TabPanel>

          {/* SLA */}
          <TabPanel px={0}>
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="lg" p={4} mb={4} maxW="520px">
              <SimpleGrid columns={2} spacing={3}>
                {Object.entries(sla.firstResponseHours || {}).map(([p, h]) => (
                  <HStack key={p} justify="space-between">
                    <Text fontSize="sm">{t(`priority.${p}`)}</Text>
                    <NumberInput size="sm" min={1} max={720} value={h} onChange={(_, v) => setSla((s) => ({ ...s, firstResponseHours: { ...s.firstResponseHours, [p]: Number.isNaN(v) ? h : v } }))} w="110px">
                      <NumberInputField />
                    </NumberInput>
                  </HStack>
                ))}
              </SimpleGrid>
            </Box>
            <HStack>
              <Button leftIcon={<FiSave />} colorScheme="teal" isLoading={update.isPending} onClick={() => update.mutate({ sla })}>{t('actions.save')}</Button>
              <Button leftIcon={<FiRotateCcw />} variant="ghost" onClick={() => setSla(JSON.parse(JSON.stringify(data.defaults.sla)))}>{t('settings.resetDefaults')}</Button>
            </HStack>
          </TabPanel>

          {/* Templates */}
          <TabPanel px={0}>
            <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
              <Text fontSize="sm" color="gray.500">{t('settings.templatesHint')}</Text>
              <HStack>
                {templates.length === 0 && <Button size="sm" leftIcon={<FiDownload />} variant="outline" onClick={() => tpl.seed.mutate()} isLoading={tpl.seed.isPending}>{t('actions.seedTemplates')}</Button>}
                <Button size="sm" leftIcon={<FiPlus />} colorScheme="teal" onClick={() => setDraft({ category: '', title: '', body: '', roles: ['admin', 'educator'], active: true })}>{t('actions.newTemplate')}</Button>
              </HStack>
            </Flex>
            {draft && (
              <Box bg={cardBg} borderWidth="1px" borderColor="teal.300" borderRadius="lg" p={4} mb={4}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={3}>
                  <Input size="sm" placeholder={t('labels.category')} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                  <Input size="sm" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </SimpleGrid>
                <Textarea size="sm" rows={4} placeholder={t('labels.message')} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} mb={3} />
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <CheckboxGroup value={draft.roles} onChange={(roles) => setDraft({ ...draft, roles })}>
                    <HStack><Text fontSize="sm">{t('settings.roles')}:</Text>{STAFF.map((r) => <Checkbox key={r} value={r} size="sm">{t(`labels.role.${r}`)}</Checkbox>)}</HStack>
                  </CheckboxGroup>
                  <HStack>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>{t('actions.cancel')}</Button>
                    <Button size="sm" colorScheme="teal" isDisabled={!draft.category || !draft.title || !draft.body || !draft.roles.length}
                      isLoading={tpl.create.isPending || tpl.update.isPending}
                      onClick={() => (draft._id ? tpl.update : tpl.create).mutate(draft, { onSuccess: () => setDraft(null) })}>{t('actions.save')}</Button>
                  </HStack>
                </Flex>
              </Box>
            )}
            {tplLoading ? <Spinner /> : (
              <VStack align="stretch" spacing={2}>
                {templates.length === 0 && <Text fontSize="sm" color="gray.500">{t('empty.templates')}</Text>}
                {templates.map((x) => (
                  <Flex key={x._id} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="lg" p={3} align="flex-start" gap={3}>
                    <Box flex={1} minW={0}>
                      <HStack mb={1} flexWrap="wrap"><Badge textTransform="none">{x.category}</Badge><Text fontWeight="semibold" fontSize="sm">{x.title}</Text>{!x.active && <Badge colorScheme="gray">inactive</Badge>}{(x.roles || []).map((r) => <Badge key={r} colorScheme={r === 'admin' ? 'red' : 'purple'} fontSize="2xs">{r}</Badge>)}</HStack>
                      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} noOfLines={2}>{x.body}</Text>
                    </Box>
                    <HStack>
                      <Button size="xs" variant="ghost" onClick={() => setDraft({ _id: x._id, category: x.category, title: x.title, body: x.body, roles: x.roles, active: x.active })}>{t('actions.edit')}</Button>
                      <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} aria-label={t('actions.delete')} onClick={() => tpl.remove.mutate(x._id)} />
                    </HStack>
                  </Flex>
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default MessagingSettingsPage;
