import React from 'react';
import { ConversationDetailPage } from '../../components/Conversation';
import * as api from '../services/api';
import { getUserInfo } from '../utils/auth';
import { t } from '../../components/conversationText';

const EducatorConversationDetail = () => (
    <ConversationDetailPage
        api={api}
        basePath="/educator/conversations"
        currentUser={getUserInfo()}
        roleLabel={t('youEducator')}
    />
);

export default EducatorConversationDetail;
