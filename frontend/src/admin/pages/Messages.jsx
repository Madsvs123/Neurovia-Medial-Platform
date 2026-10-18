import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { InboxPage, NewThreadPage, adminPortal } from '../../features/messaging';
import { getUserInfo } from '../../utils/auth';

// Thin wrappers: the whole UI lives in features/messaging, configured by adminPortal.
const AdminMessages = () => <InboxPage portal={adminPortal} currentUser={getUserInfo()} title="Messages" />;
export const AdminNewMessage = () => <NewThreadPage portal={adminPortal} currentUser={getUserInfo()} />;

export const LegacyConversationRedirect = ({ base }) => {
  const { id } = useParams();
  return <Navigate to={`${base}/${id}`} replace />;
};

export default AdminMessages;
