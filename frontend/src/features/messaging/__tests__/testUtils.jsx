import React from 'react';
import { render } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const renderWithProviders = (ui, { route = '/' } = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={qc}>
        <ChakraProvider>{ui}</ChakraProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

export const users = {
  admin: { _id: 'a1', role: 'admin', username: 'root' },
  educator: { _id: 'e1', role: 'educator', username: 'drsmith' },
  student: { _id: 's1', role: 'student', username: 'jane' },
};

export const thread = (overrides = {}) => ({
  _id: 't1',
  kind: 'support',
  subject: 'Cannot open lesson 3',
  category: 'technical',
  priority: 'normal',
  status: 'open',
  team: 'technical',
  requester: users.student,
  assignee: users.admin,
  context: {},
  participants: [{ user: users.student, role: 'requester' }, { user: users.admin, role: 'assignee' }],
  me: { role: 'assignee', lastReadAt: null },
  counterpart: users.student,
  lastMessage: { text: 'hello' },
  lastActivityAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  messageCount: 2,
  unreadCount: 0,
  capabilities: { reply: true, note: true, claim: false, join: false, assign: true, unassign: true, setPriority: true, escalate: true, changeStatus: true, archive: true, delete: true, readMessages: true, transitions: ['waiting_requester', 'resolved', 'closed'] },
  ...overrides,
});
