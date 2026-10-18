import React, { useState } from 'react';
import {
  Box, Flex, HStack, Text, Heading, IconButton, Button, Menu, MenuButton, MenuList, MenuItem, MenuDivider,
  Spinner, Alert, AlertIcon, useColorModeValue, useDisclosure, Tooltip, Icon, Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerCloseButton,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiMoreVertical, FiCheckCircle, FiRotateCcw, FiXCircle, FiArchive, FiTrash2, FiInfo, FiUserPlus, FiLogIn, FiClock, FiArrowUpRight, FiEye,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useThread, useMessages, useSendMessage, useThreadActions, useThreadPresence, useTyping } from '../hooks';
import MessageTimeline from './MessageTimeline';
import Composer from './Composer';
import ThreadSidebar from './ThreadSidebar';
import { EscalateDialog, StaffPickerDialog, ConfirmDialog } from './dialogs';
import { StatusBadge, KindBadge, PriorityBadge, TeamBadge, UserChip } from './atoms';
import { isStaffRole, sameId } from '../model/meta';

const TRANSITION_META = {
  open: { icon: FiRotateCcw, labelKey: 'actions.open', color: 'blue' },
  waiting_requester: { icon: FiClock, labelKey: 'actions.waiting', color: 'purple' },
  resolved: { icon: FiCheckCircle, labelKey: 'actions.resolve', color: 'green' },
  closed: { icon: FiXCircle, labelKey: 'actions.close', color: 'gray' },
};

/**
 * Centre pane: header (subject, badges, primary actions) → timeline →
 * composer. Right sidebar on ≥lg, drawer below. Everything it shows is
 * derived from `thread.capabilities` coming from the API.
 */
const ThreadView = ({ threadId, currentUser, config, portal, onBack, compact = false }) => {
  const { t } = useTranslation();
  const myId = currentUser?._id || currentUser?.id;
  const isStaff = isStaffRole(currentUser?.role);
  const headerBg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const sidebarBg = useColorModeValue('gray.50', 'gray.900');
  const observeBg = useColorModeValue('orange.50', 'orange.900');
  const editBg = useColorModeValue('blue.50', 'blue.900');

  const { data: thread, isLoading, error } = useThread(threadId);
  const canView = !!thread?.capabilities?.viewMessages;
  const { messages, isLoading: msgsLoading, hasPreviousPage, fetchPreviousPage, isFetchingPreviousPage } = useMessages(threadId, canView);
  const send = useSendMessage(threadId, currentUser);
  const actions = useThreadActions(threadId);
  const { names: typingNames, notifyTyping, stopTyping } = useTyping(threadId);
  useThreadPresence(thread);

  const escalate = useDisclosure();
  const assign = useDisclosure();
  const addPart = useDisclosure();
  const del = useDisclosure();
  const info = useDisclosure();
  const [editing, setEditing] = useState(null);

  if (isLoading) return <Flex flex={1} justify="center" align="center" h="100%"><Spinner color="teal.500" /></Flex>;
  if (error || !thread) {
    return (
      <Flex flex={1} align="flex-start" p={4}>
        <Alert status="warning" borderRadius="lg"><AlertIcon />{error?.response?.data?.message || t('empty.selectThread')}</Alert>
      </Flex>
    );
  }

  const caps = thread.capabilities || {};
  const isRequester = sameId(thread.requester, myId);
  const isClosed = thread.status === 'closed';
  const transitions = caps.transitions || [];
  const primary = transitions.includes('resolved') ? 'resolved' : transitions.includes('open') ? 'open' : null;
  const readers = (thread.participants || []).map((p) => ({ userId: p.user?._id || p.user, lastReadAt: p.lastReadAt }));

  const lockedForStaff = isStaff && !isRequester && isClosed && thread.kind !== 'direct';
  const composerLocked = !caps.reply;
  const lockedMessage = !caps.isMember
    ? t('composer.observing')
    : lockedForStaff ? t('composer.closedStaff') : t('composer.closedRequester');

  const handleSend = ({ body, kind }) => {
    stopTyping();
    if (editing) { actions.editMessage.mutate({ mid: editing._id, body }); setEditing(null); return; }
    send.mutate({ body, kind });
  };

  const sidebar = (
    <ThreadSidebar
      thread={thread}
      currentUser={currentUser}
      config={config}
      cards={portal.sidebarCards}
      actions={{ ...Object.fromEntries(Object.entries(actions).map(([k, m]) => [k, (...a) => m.mutate(...a)])), linkTo: portal.threadPath }}
      onAssign={assign.onOpen}
      onEscalate={escalate.onOpen}
      onAddParticipant={addPart.onOpen}
      profileLinkFor={portal.profileLinkFor}
    />
  );

  return (
    <Flex h="100%" minH={0}>
      <Flex direction="column" flex={1} minW={0} minH={0}>
        {/* Header */}
        <Flex px={compact ? 3 : 4} py={compact ? 2 : 3} bg={headerBg} borderBottomWidth="1px" borderColor={border} align="center" gap={2}>
          {onBack && <IconButton icon={<FiArrowLeft />} aria-label={t('actions.back')} variant="ghost" size="sm" onClick={onBack} />}
          <Box flex={1} minW={0}>
            <Heading size={compact ? 'xs' : 'sm'} noOfLines={1}>{thread.subject}</Heading>
            <HStack spacing={1.5} mt={1} flexWrap="wrap">
              {thread.kind !== 'direct' && <StatusBadge status={thread.status} asRequester={!isStaff} />}
              <KindBadge kind={thread.kind} />
              <PriorityBadge priority={thread.priority} />
              {isStaff && thread.kind !== 'direct' && <TeamBadge team={thread.team} />}
              {!compact && thread.counterpart && <Box display={{ base: 'none', md: 'block' }}><UserChip user={thread.counterpart} /></Box>}
            </HStack>
          </Box>

          <HStack spacing={1}>
            {caps.claim && <Button size="sm" colorScheme="teal" onClick={() => actions.claim.mutate()} isLoading={actions.claim.isPending}>{t('actions.claim')}</Button>}
            {!caps.isMember && caps.join && (
              <Button size="sm" variant="outline" leftIcon={<FiLogIn />} onClick={() => actions.join.mutate()} isLoading={actions.join.isPending}>{t('actions.join')}</Button>
            )}
            {primary && caps.changeStatus && (
              <Button size="sm" colorScheme={TRANSITION_META[primary].color} variant={primary === 'resolved' ? 'solid' : 'outline'} leftIcon={<Icon as={TRANSITION_META[primary].icon} />}
                onClick={() => actions.setStatus.mutate(primary)} isLoading={actions.setStatus.isPending}>
                {t(primary === 'open' && (thread.status === 'resolved' || thread.status === 'closed') ? 'actions.reopen' : TRANSITION_META[primary].labelKey)}
              </Button>
            )}
            <Tooltip label={t('labels.details')} hasArrow>
              <IconButton icon={<FiInfo />} aria-label={t('labels.details')} variant="ghost" size="sm" onClick={info.onOpen} display={{ base: 'inline-flex', lg: compact ? 'inline-flex' : 'none' }} />
            </Tooltip>
            <Menu placement="bottom-end" isLazy>
              <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" aria-label="More actions" />
              <MenuList>
                {transitions.filter((s) => s !== primary).map((s) => (
                  <MenuItem key={s} icon={<Icon as={TRANSITION_META[s].icon} />} onClick={() => actions.setStatus.mutate(s)}>{t(TRANSITION_META[s].labelKey)}</MenuItem>
                ))}
                {caps.escalate && <MenuItem icon={<FiArrowUpRight />} onClick={escalate.onOpen}>{t('actions.escalate')}</MenuItem>}
                {caps.assign && <MenuItem icon={<FiUserPlus />} onClick={assign.onOpen}>{thread.assignee ? t('actions.reassign') : t('actions.assign')}</MenuItem>}
                {caps.addParticipant && <MenuItem icon={<FiUserPlus />} onClick={addPart.onOpen}>{t('actions.addParticipant')}</MenuItem>}
                {(transitions.length || caps.escalate || caps.assign) ? <MenuDivider /> : null}
                {caps.archive && (thread.me?.archivedAt
                  ? <MenuItem icon={<FiArchive />} onClick={() => actions.unarchive.mutate()}>{t('actions.unarchive')}</MenuItem>
                  : <MenuItem icon={<FiArchive />} onClick={() => actions.archive.mutate()}>{t('actions.archive')}</MenuItem>)}
                {caps.archive && <MenuItem icon={<FiTrash2 />} color="red.500" onClick={del.onOpen}>{t('actions.delete')}</MenuItem>}
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        {!caps.isMember && (
          <Flex px={4} py={2} bg={observeBg} fontSize="xs" align="center" gap={2}>
            <Icon as={FiEye} /><Text>{t('labels.observing')}</Text>
          </Flex>
        )}

        {/* Timeline */}
        <MessageTimeline
          messages={messages}
          myId={myId}
          loading={canView && msgsLoading}
          hasOlder={!!hasPreviousPage}
          loadOlder={fetchPreviousPage}
          loadingOlder={isFetchingPreviousPage}
          canEdit={caps.reply}
          onEdit={(m) => setEditing(m)}
          onDelete={(m) => actions.deleteMessage.mutate(m._id)}
          readers={readers}
          emptyNode={!canView ? <Flex flex={1} justify="center" align="center" color="gray.500"><Text fontSize="sm">{t('labels.observing')}</Text></Flex> : null}
        />

        {typingNames.length > 0 && (
          <Text fontSize="xs" color="gray.500" px={4} py={1}>{t('labels.typing', { name: typingNames.join(', ') })}</Text>
        )}
        {editing && (
          <Flex px={4} py={1} fontSize="xs" bg={editBg} align="center" justify="space-between">
            <Text>{t('actions.edit')}: {editing.body.slice(0, 60)}</Text>
            <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>{t('actions.cancel')}</Button>
          </Flex>
        )}

        {/* Composer */}
        <Composer
          onSend={handleSend}
          sending={send.isPending}
          locked={composerLocked}
          lockedMessage={lockedMessage}
          onUnlock={!caps.isMember && caps.join ? () => actions.join.mutate() : (lockedForStaff && caps.changeStatus ? () => actions.setStatus.mutate('open') : null)}
          unlockLabel={!caps.isMember ? t('actions.join') : t('actions.reopen')}
          allowNotes={caps.note}
          quickReplies={isStaff && caps.reply}
          onTyping={notifyTyping}
          compact={compact}
          autoFocus={!compact}
        />
      </Flex>

      {/* Sidebar (desktop) */}
      {!compact && (
        <Box w="300px" flexShrink={0} display={{ base: 'none', lg: 'block' }} overflowY="auto" p={3} bg={sidebarBg} borderLeftWidth="1px" borderColor={border}>
          {sidebar}
        </Box>
      )}
      <Drawer isOpen={info.isOpen} onClose={info.onClose} placement="right" size="sm">
        <DrawerOverlay />
        <DrawerContent><DrawerCloseButton /><DrawerBody pt={10} bg={sidebarBg}>{sidebar}</DrawerBody></DrawerContent>
      </Drawer>

      {/* Dialogs */}
      <EscalateDialog isOpen={escalate.isOpen} onClose={escalate.onClose} teams={config?.teams || []} defaultTeam={thread.team === 'clinical' ? 'support' : 'clinical'}
        isLoading={actions.escalate.isPending} onSubmit={(body) => actions.escalate.mutate(body, { onSuccess: escalate.onClose })} />
      <StaffPickerDialog isOpen={assign.isOpen} onClose={assign.onClose} title={t('assign.title')} kind="internal" allowUnassign={!!thread.assignee}
        isLoading={actions.assign.isPending} onPick={(u) => actions.assign.mutate(u ? u._id : null, { onSuccess: assign.onClose })} />
      <StaffPickerDialog isOpen={addPart.isOpen} onClose={addPart.onClose} title={t('actions.addParticipant')} kind="internal"
        isLoading={actions.addParticipant.isPending} onPick={(u) => u && actions.addParticipant.mutate({ userId: u._id }, { onSuccess: addPart.onClose })} />
      <ConfirmDialog isOpen={del.isOpen} onClose={del.onClose} title={t('actions.delete')} body={t('actions.delete') + '?'} confirmLabel={t('actions.delete')}
        isLoading={actions.remove.isPending} onConfirm={() => actions.remove.mutate(false, { onSuccess: () => { del.onClose(); onBack?.(); } })} />
    </Flex>
  );
};

export default ThreadView;
