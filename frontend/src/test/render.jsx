import React from 'react';
import { render } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Render with Chakra + React Query + a MemoryRouter at `path` (route pattern `routePath`). */
export const renderWithProviders = (ui, { path = '/', routePath = '*' } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false } } });
  return render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={ui} />
            <Route path="*" element={<div data-testid="somewhere-else" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
};

/** Axios-like error object */
export const axiosError = (status, message, code) => {
  const err = new Error(message);
  err.response = { status, data: { message, code } };
  return err;
};
