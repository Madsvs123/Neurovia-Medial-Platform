import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import QuickReply from '../QuickReply';

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('QuickReply — role-based template visibility', () => {
  it('hides the billing/refund templates for educators', async () => {
    renderWithChakra(<QuickReply onSelect={() => {}} role="educator" />);
    fireEvent.click(screen.getByRole('button', { name: /quick reply/i }));

    expect(await screen.findByText('Greeting')).toBeInTheDocument();
    expect(screen.queryByText('Subscription & Billing')).not.toBeInTheDocument();
  });

  it('shows the billing/refund templates for admins', async () => {
    renderWithChakra(<QuickReply onSelect={() => {}} role="admin" />);
    fireEvent.click(screen.getByRole('button', { name: /quick reply/i }));

    expect(await screen.findByText('Subscription & Billing')).toBeInTheDocument();
  });
});
