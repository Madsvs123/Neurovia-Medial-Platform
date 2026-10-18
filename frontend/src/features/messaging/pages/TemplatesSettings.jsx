import React, { useState } from 'react';
import {
  Box, Flex, Heading, Text, Button, IconButton, Table, Thead, Tbody, Tr, Th, Td, Badge, Switch,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Textarea, CheckboxGroup, Checkbox, HStack, VStack, Spinner, useToast,
  useColorModeValue, useDisclosure,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useTemplateAdmin } from '../hooks/useMessaging';

const EMPTY = { title: '', body: '', category: 'General', audience: ['admin', 'educator'], active: true };

/** Admin → Settings → Messaging: CRUD for quick-reply templates. */
const TemplatesSettings = () => {
  const { t } = useTranslation('messaging');
  const toast = useToast();
  const { list, create, update, remove } = useTemplateAdmin();
  const dlg = useDisclosure();
  const [draft, setDraft] = useState(EMPTY);
  const bg = useColorModeValue('white', 'gray.800');

  const openNew = () => { setDraft(EMPTY); dlg.onOpen(); };
  const openEdit = (tpl) => { setDraft({ ...tpl }); dlg.onOpen(); };

  const save = async () => {
    const payload = { title: draft.title, body: draft.body, category: draft.category, audience: draft.audience, active: draft.active };
    if (draft._id) await update.mutateAsync({ id: draft._id, ...payload });
    else await create.mutateAsync(payload);
    toast({ title: t('templates.saved'), status: 'success', duration: 2000 });
    dlg.onClose();
  };

  const del = async (tpl) => {
    if (!window.confirm(t('templates.deleteConfirm'))) return;
    await remove.mutateAsync(tpl._id);
    toast({ title: t('templates.deleted'), status: 'info', duration: 2000 });
  };

  return (
    <Box bg={bg} borderRadius="xl" boxShadow="sm" p={5} borderWidth="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
      <Flex justify="space-between" align="center" mb={1}>
        <Heading size="sm">{t('templates.title')}</Heading>
        <Button size="sm" leftIcon={<FiPlus />} colorScheme="teal" onClick={openNew}>{t('templates.add')}</Button>
      </Flex>
      <Text fontSize="sm" color="gray.500" mb={4}>{t('templates.description')}</Text>

      {list.isLoading ? <Spinner size="sm" /> : (list.data || []).length === 0 ? (
        <Text fontSize="sm" color="gray.400">{t('templates.empty')}</Text>
      ) : (
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr><Th>{t('templates.titleField')}</Th><Th>{t('templates.categoryField')}</Th><Th>{t('templates.audienceField')}</Th><Th>{t('templates.activeField')}</Th><Th /></Tr>
            </Thead>
            <Tbody>
              {list.data.map((tpl) => (
                <Tr key={tpl._id}>
                  <Td><Text fontWeight="semibold">{tpl.title}</Text><Text fontSize="xs" color="gray.500" noOfLines={1}>{tpl.body}</Text></Td>
                  <Td><Badge>{tpl.category}</Badge></Td>
                  <Td><HStack spacing={1}>{tpl.audience.map((a) => <Badge key={a} colorScheme={a === 'admin' ? 'red' : 'purple'} fontSize="10px">{a}</Badge>)}</HStack></Td>
                  <Td><Switch size="sm" isChecked={tpl.active} onChange={(e) => update.mutate({ id: tpl._id, active: e.target.checked })} /></Td>
                  <Td textAlign="right">
                    <IconButton icon={<FiEdit2 />} size="xs" variant="ghost" aria-label={t('actions.edit')} onClick={() => openEdit(tpl)} />
                    <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" aria-label={t('actions.delete')} onClick={() => del(tpl)} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={dlg.isOpen} onClose={dlg.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{draft._id ? t('actions.edit') : t('templates.add')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired><FormLabel fontSize="sm">{t('templates.titleField')}</FormLabel><Input size="sm" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80} /></FormControl>
              <FormControl><FormLabel fontSize="sm">{t('templates.categoryField')}</FormLabel><Input size="sm" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} maxLength={40} /></FormControl>
              <FormControl isRequired><FormLabel fontSize="sm">{t('templates.bodyField')}</FormLabel><Textarea size="sm" rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={2000} /></FormControl>
              <FormControl>
                <FormLabel fontSize="sm">{t('templates.audienceField')}</FormLabel>
                <CheckboxGroup value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })}>
                  <HStack spacing={4}><Checkbox value="admin">{t('templates.admins')}</Checkbox><Checkbox value="educator">{t('templates.educators')}</Checkbox></HStack>
                </CheckboxGroup>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={dlg.onClose}>{t('actions.cancel')}</Button>
            <Button colorScheme="teal" onClick={save} isLoading={create.isPending || update.isPending} isDisabled={!draft.title.trim() || !draft.body.trim() || draft.audience.length === 0}>{t('actions.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TemplatesSettings;
