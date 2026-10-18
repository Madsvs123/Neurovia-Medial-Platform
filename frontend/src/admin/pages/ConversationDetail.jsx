import React from 'react';
import { ConversationDetailPage } from '../../components/Conversation';
import * as api from '../services/api';
import { getUserInfo } from '../../utils/auth';
import { t } from '../../components/conversationText';

const ConversationDetail = () => (
    <ConversationDetailPage
        api={api}
        basePath="/admin/conversations"
        currentUser={getUserInfo()}
        roleLabel={t('youAdmin')}
    />
);

export default ConversationDetail;
