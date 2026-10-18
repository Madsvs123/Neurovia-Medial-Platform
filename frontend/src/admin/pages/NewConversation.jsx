import React from 'react';
import { NewConversationPage } from '../../components/Conversation';
import * as api from '../services/api';
import { getUserInfo } from '../../utils/auth';

const AdminNewConversation = () => (
    <NewConversationPage
        api={api}
        basePath="/admin/conversations"
        currentUser={getUserInfo()}
    />
);

export default AdminNewConversation;
