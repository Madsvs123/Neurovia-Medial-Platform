import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, FormControl, FormLabel,
  Select, Textarea, Input, VStack, HStack, Text, Box, Spinner, useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRecipients } from '../hooks';
import { UserChip } from './atoms';

export const EscalateDialog = ({ isOpen, onClose, teams = [], defaultTeam = 'support', onSubmit, isLoading }) => {
  const { t } = useTranslation();
  const [toTeam, setToTeam] = useState(defaultTeam);
  const [note, setNote] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('escalate.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel fontSize="sm">{t('escalate.team')}</FormLabel>
              <Select value={toTeam} onChange={(e) => setToTeam(e.target.value)}>
                {teams.map((tm) => <option key={tm} value={tm}>{t(`team.${tm}`)}</option>)}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">{t('escalate.note')}</FormLabel>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button colorScheme="purple" isDisabled={!note.trim()} isLoading={isLoading} onClick={() => onSubmit({ toTeam, note: note.trim() })}>{t('actions.escalate')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

/** Staff picker used for assign / add participant. */
export const StaffPickerDialog = ({ isOpen, onClose, title, onPick, isLoading, kind = 'internal', allowUnassign = false }) => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const { data, isLoading: loading } = useRecipients({ kind, q }, isOpen);
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Input placeholder={t('assign.search')} value={q} onChange={(e) => setQ(e.target.value)} mb={3} autoFocus />
          {loading ? <Spinner size="sm" /> : (
            <VStack align="stretch" spacing={1}>
              {allowUnassign && (
                <Button variant="ghost" justifyContent="flex-start" size="sm" onClick={() => onPick(null)}>{t('actions.unassign')}</Button>
              )}
              {(data?.users || []).map((u) => (
                <Box key={u._id} as="button" textAlign="left" p={2} borderRadius="md" _hover={{ bg: hoverBg }} onClick={() => onPick(u)} aria-label={u.username}>
                  <HStack justify="space-between"><UserChip user={u} /><Text fontSize="xs" color="gray.500">{u.email}</Text></HStack>
                </Box>
              ))}
              {data && data.users?.length === 0 && <Text fontSize="sm" color="gray.500" py={4} textAlign="center">{t('new.noRecipients')}</Text>}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} isLoading={isLoading}>{t('actions.cancel')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const ConfirmDialog = ({ isOpen, onClose, title, body, confirmLabel, onConfirm, isLoading, colorScheme = 'red' }) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody><Text fontSize="sm">{body}</Text></ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button colorScheme={colorScheme} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
