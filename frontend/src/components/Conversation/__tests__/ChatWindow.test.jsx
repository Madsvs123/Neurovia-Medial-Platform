import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import ChatWindow from '../ChatWindow';

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

const currentUser = { _id: 'u1', role: 'educator', username: 'edu1' };

describe('ChatWindow — closed conversation lockout', () => {
  it('shows the locked banner and a reopen control instead of the composer', () => {
    const onReopen = vi.fn();
    renderWithChakra(
      <ChatWindow
        conversation={{ _id: 'c1', status: 'closed' }}
        messages={[]}
        currentUser={currentUser}
        onSend={() => {}}
        locked
        lockedMessage="This conversation is resolved."
        onReopen={onReopen}
      />
    );

    expect(screen.getByText('This conversation is resolved.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();

    screen.getByText('Reopen to continue').click();
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it('shows a normal composer when not locked', () => {
    renderWithChakra(
      <ChatWindow
        conversation={{ _id: 'c1', status: 'pending-admin' }}
        messages={[]}
        currentUser={currentUser}
        onSend={() => {}}
        locked={false}
      />
    );

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('renders the sender username (not a blank/undefined name)', () => {
    renderWithChakra(
      <ChatWindow
        conversation={{ _id: 'c1', status: 'pending-admin' }}
        messages={[
          {
            _id: 'm1',
            message: 'hello there',
            senderRole: 'student',
            sender: { _id: 'student1', username: 'janedoe' },
            createdAt: new Date().toISOString(),
          },
        ]}
        currentUser={currentUser}
        onSend={() => {}}
      />
    );

    expect(screen.getByText('janedoe')).toBeInTheDocument();
  });
});
