import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { InboxPage, NewThreadPage, educatorPortal } from '../../features/messaging';
import { getUserInfo } from '../utils/auth';

// Thin wrappers: the whole UI lives in features/messaging, configured by educatorPortal.
const EducatorMessages = () => <InboxPage portal={educatorPortal} currentUser={getUserInfo()} title="Messages" />;
export const EducatorNewMessage = () => <NewThreadPage portal={educatorPortal} currentUser={getUserInfo()} />;

export const LegacyConversationRedirect = ({ base }) => {
  const { id } = useParams();
  return <Navigate to={`${base}/${id}`} replace />;
};

export default EducatorMessages;
