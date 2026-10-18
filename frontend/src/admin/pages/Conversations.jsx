import React from 'react';
import { ConversationsPage } from '../../components/Conversation';
import * as api from '../services/api';
import { getUserInfo } from '../../utils/auth';

// Thin, role-specific wrapper around the shared ConversationsPage. Admins
// additionally get a platform-wide "All Conversations" oversight tab.
const AdminConversations = () => (
    <ConversationsPage
        api={api}
        basePath="/admin/conversations"
        heading="Support Conversations"
        currentUser={getUserInfo()}
        showAllConversationsTab
    />
);

export default AdminConversations;
