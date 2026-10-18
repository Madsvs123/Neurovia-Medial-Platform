import React from 'react';
import { ConversationsPage } from '../../components/Conversation';
import * as api from '../services/api';
import { getUserInfo } from '../utils/auth';

// Thin, role-specific wrapper around the shared ConversationsPage.
const EducatorConversations = () => (
    <ConversationsPage
        api={api}
        basePath="/educator/conversations"
        heading="Student Conversations"
        currentUser={getUserInfo()}
    />
);

export default EducatorConversations;
