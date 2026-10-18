import React from 'react';
import { useSelector } from 'react-redux';
import { Container } from '@chakra-ui/react';
import { InboxPage, studentPortal } from '../features/messaging';

const MessagesPage = ({ mode }) => {
  const { userInfo } = useSelector((state) => state.auth);
  return (
    <Container maxW="1400px" py={{ base: 0, md: 6 }} px={{ base: 0, md: 4 }}>
      <InboxPage portal={studentPortal} currentUser={userInfo} mode={mode} />
    </Container>
  );
};

export default MessagesPage;
