import React from 'react';
import { NewConversationPage } from '../../components/Conversation';
import * as api from '../services/api';
import { getUserInfo } from '../utils/auth';

const EducatorNewConversation = () => (
    <NewConversationPage
        api={api}
        basePath="/educator/conversations"
        currentUser={getUserInfo()}
    />
);

export default EducatorNewConversation;
