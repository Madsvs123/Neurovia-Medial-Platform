import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** `/…/conversations/:id` → `/…/messages/:id` (old bookmarks / notifications). */
const LegacyRedirect = ({ base }) => {
  const { threadId } = useParams();
  return <Navigate to={threadId ? `${base}/${threadId}` : base} replace />;
};

export default LegacyRedirect;
