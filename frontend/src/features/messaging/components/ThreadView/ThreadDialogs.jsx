import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, FormControl, FormLabel, Select, Textarea, Input, VStack, HStack, Text, Box, Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRecipients } from '../../hooks/useMessaging';
import { UserAvatar, RoleBadge } from '../shared/Badges';
import { displayName } from '../../model/meta';

const TEAMS = ['support', 'billing', 'technical', 'clinical'];

/** Searchable person list (staff directory or program-scoped recipients). */
export const PeoplePicker = ({ onPick, onlyStaff = false, roles = null, exclude = [] }) => {
  const { t } = useTranslation('messaging');
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useRecipients(q);
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const list = data.filter((u) => (!onlyStaff || ['admin', 'educator'].includes(u.role)) && (!roles || roles.includes(u.role)) && !exclude.includes(String(u._id)));

  return (
    <Box>
      <Input size="sm" placeholder={t('new.searchPeople')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus mb={2} />
      {isLoading ? <Spinner size="sm" /> : list.length === 0 ? (
        <Text fontSize="sm" color="gray.500">{t('new.noPeople')}</Text>
      ) : (
        <VStack align="stretch" spacing={0.5} maxH="280px" overflowY="auto">
          {list.map((u) => (
            <HStack key={u._id} as="button" type="button" p={2} borderRadius="md" _hover={{ bg: hoverBg }} onClick={() => onPick(u)} textAlign="left">
              <UserAvatar user={u} size="xs" />
              <Box flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{displayName(u)}</Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>{u.email}</Text>
              </Box>
              <RoleBadge role={u.role} />
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export const AssignDialog = ({ isOpen, onClose, onAssign, isLoading }) => {
  const { t } = useTranslation('messaging');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('assign.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? <Spinner /> : <PeoplePicker onlyStaff onPick={(u) => onAssign(u._id)} />}
        </ModalBody>
        <ModalFooter><Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const AddParticipantDialog = ({ isOpen, onClose, onAdd, exclude = [] }) => {
  const { t } = useTranslation('messaging');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('actions.addParticipant')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody><PeoplePicker onPick={(u) => onAdd(u._id)} exclude={exclude} /></ModalBody>
        <ModalFooter><Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button></ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const EscalateDialog = ({ isOpen, onClose, currentTeam, onEscalate, isLoading }) => {
  const { t } = useTranslation('messaging');
  const [toTeam, setToTeam] = useState('');
  const [note, setNote] = useState('');
  const options = TEAMS.filter((tm) => tm !== currentTeam);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('escalate.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel fontSize="sm">{t('escalate.toTeam')}</FormLabel>
              <Select size="sm" value={toTeam} onChange={(e) => setToTeam(e.target.value)} placeholder="—">
                {options.map((tm) => <option key={tm} value={tm}>{t(`team.${tm}`)}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">{t('escalate.note')}</FormLabel>
              <Textarea size="sm" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('escalate.notePlaceholder')} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>{t('actions.cancel')}</Button>
          <Button colorScheme="teal" isDisabled={!toTeam} isLoading={isLoading} onClick={() => onEscalate({ toTeam, note })}>{t('escalate.confirm')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
