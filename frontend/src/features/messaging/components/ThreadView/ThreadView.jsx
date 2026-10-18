import React, { useEffect, useMemo, useState } from 'react';
import { Box, Flex, Spinner, Alert, AlertIcon, useToast, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ThreadHeader from './ThreadHeader';
import MessageTimeline from './MessageTimeline';
import Composer from './Composer';
import { AssignDialog, EscalateDialog, AddParticipantDialog } from './ThreadDialogs';
import { useThread, useMessages, useSendMessage, useThreadActions } from '../../hooks/useMessaging';
import { useThreadRoom } from '../../hooks/MessagingSocketProvider';
import { errorMessage } from '../../../../lib/http';
import { idOf } from '../../model/meta';

/**
 * A complete thread: header/actions, timeline, composer, dialogs.
 * Used by the full-page ThreadPage (all portals) and by the student
 * floating widget (compact mode). Knows nothing about routes except the
 * optional `onBack` / `onNavigateToThread` callbacks.
 */
const ThreadView = ({ threadId, currentUser, portal, onBack, onNavigateToThread, compact = false, sidebar = null }) => {
  const { t } = useTranslation('messaging');
  const toast = useToast();
  const navigate = useNavigate();
  const isStaff = !!portal?.isStaff;
  const isAdmin = currentUser?.role === 'admin';
  const myId = currentUser?._id || currentUser?.id;

  const { data: thread, isLoading, error } = useThread(threadId);
  const messagesQ = useMessages(threadId, { enabled: !!thread?.capabilities?.readMessages });
  const send = useSendMessage(threadId);
  const actions = useThreadActions(threadId);
  const { typing, sendTyping } = useThreadRoom(thread?.capabilities?.readMessages ? threadId : null);

  const assignDlg = useDisclosure();
  const escalateDlg = useDisclosure();
  const participantDlg = useDisclosure();
  const [pendingStatus, setPendingStatus] = useState(null);

  const messages = useMemo(() => messagesQ.data?.flat || [], [messagesQ.data]);

  // Mark as read whenever there are unread incoming messages on screen
  const hasUnread = useMemo(() => {
    if (!thread?.me) return false;
    const last = thread.me.lastReadAt ? new Date(thread.me.lastReadAt).getTime() : 0;
    return messages.some((m) => String(idOf(m.sender)) !== String(myId) && new Date(m.createdAt).getTime() > last);
  }, [messages, thread, myId]);

  useEffect(() => {
    if (hasUnread && !actions.markRead.isPending) actions.markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread, threadId]);

  const ok = (key) => toast({ title: t(key), status: 'success', duration: 2500, isClosable: true });
  const fail = (err) => toast({ title: t('toast.error'), description: errorMessage(err), status: 'error', duration: 4000, isClosable: true });

  const handleAction = async (action, arg) => {
    try {
      switch (action) {
        case 'claim': await actions.claim.mutateAsync(); ok('toast.claimed'); break;
        case 'join': await actions.join.mutateAsync(); break;
        case 'status':
          setPendingStatus(arg);
          await actions.update.mutateAsync({ status: arg });
          setPendingStatus(null);
          ok('toast.statusUpdated');
          break;
        case 'priority': await actions.update.mutateAsync({ priority: arg }); break;
        case 'assign': assignDlg.onOpen(); break;
        case 'unassign': await actions.unassign.mutateAsync(); break;
        case 'escalate': escalateDlg.onOpen(); break;
        case 'addParticipant': participantDlg.onOpen(); break;
        case 'removeParticipant': await actions.removeParticipant.mutateAsync(arg); break;
        case 'archive': await actions.archive.mutateAsync(); ok('toast.archived'); onBack?.(); break;
        case 'unarchive': await actions.unarchive.mutateAsync(); ok('toast.unarchived'); break;
        case 'delete':
          if (window.confirm(t('actions.deleteConfirm'))) { await actions.remove.mutateAsync({}); ok('toast.deleted'); onBack?.(); }
          break;
        case 'hardDelete':
          if (window.confirm(t('actions.hardDeleteConfirm'))) { await actions.remove.mutateAsync({ hard: true }); ok('toast.deleted'); onBack?.(); }
          break;
        default: break;
      }
    } catch (err) {
      setPendingStatus(null);
      // mutations already toast on error via the hooks; avoid double toasts
      if (!err?.response) fail(err);
    }
  };

  if (isLoading) return <Flex justify="center" align="center" h="100%"><Spinner color="teal.500" /></Flex>;
  if (error || !thread) {
    return (
      <Box p={6}>
        <Alert status="warning" borderRadius="lg"><AlertIcon />{error ? errorMessage(error, t('thread.notFound')) : t('thread.notFound')}</Alert>
      </Box>
    );
  }

  const goToThread = (id) => (onNavigateToThread ? onNavigateToThread(id) : navigate(`${portal.basePath}/${id}`));

  return (
    <Flex h="100%" minH={0}>
      <Flex direction="column" flex={1} minW={0} minH={0}>
        <ThreadHeader thread={thread} isStaff={isStaff} isAdmin={isAdmin} onBack={onBack} onAction={handleAction} compact={compact} />

        <Box flex={1} minH={0}>
          <MessageTimeline
            messages={messages}
            currentUserId={myId}
            thread={thread}
            loading={messagesQ.isLoading && !!thread.capabilities?.readMessages}
            hasOlder={!!messagesQ.hasNextPage}
            loadingOlder={messagesQ.isFetchingNextPage}
            onLoadOlder={() => messagesQ.fetchNextPage()}
            canModerate={isAdmin}
            onEdit={(messageId, body) => actions.editMessage.mutate({ messageId, body })}
            onDelete={(messageId) => { if (window.confirm(t('actions.deleteConfirm'))) actions.deleteMessage.mutate(messageId); }}
            typing={typing}
          />
        </Box>

        <Composer
          thread={thread}
          capabilities={thread.capabilities}
          isStaff={isStaff}
          sending={send.isPending}
          onSend={(payload) => send.mutate(payload)}
          onTyping={sendTyping}
          onJoin={() => handleAction(thread.capabilities?.claim ? 'claim' : 'join')}
          onReopen={() => handleAction('status', 'open')}
          compact={compact}
        />
      </Flex>

      {sidebar && (
        <Box w="300px" flexShrink={0} display={{ base: 'none', xl: 'block' }} borderLeftWidth="1px" borderColor="gray.100" _dark={{ borderColor: 'gray.700' }} overflowY="auto">
          {React.cloneElement(sidebar, { thread, onAction: handleAction, onNavigateToThread: goToThread, pendingStatus })}
        </Box>
      )}

      <AssignDialog
        isOpen={assignDlg.isOpen}
        onClose={assignDlg.onClose}
        isLoading={actions.assign.isPending}
        onAssign={async (userId) => { await actions.assign.mutateAsync(userId); assignDlg.onClose(); ok('assign.done'); }}
      />
      <EscalateDialog
        isOpen={escalateDlg.isOpen}
        onClose={escalateDlg.onClose}
        currentTeam={thread.team}
        isLoading={actions.escalate.isPending}
        onEscalate={async (data) => {
          const res = await actions.escalate.mutateAsync(data);
          escalateDlg.onClose();
          ok('escalate.done');
          if (res?.child?._id) goToThread(res.child._id);
        }}
      />
      <AddParticipantDialog
        isOpen={participantDlg.isOpen}
        onClose={participantDlg.onClose}
        exclude={(thread.participants || []).map((p) => String(idOf(p.user)))}
        onAdd={async (userId) => { await actions.addParticipant.mutateAsync({ userId }); participantDlg.onClose(); }}
      />
    </Flex>
  );
};

export default ThreadView;
