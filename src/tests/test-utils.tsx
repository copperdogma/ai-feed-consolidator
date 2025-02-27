import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';
import { createTestQueryClient } from './setup-react';

interface WrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

interface WrapperRenderProps {
  children: React.ReactNode;
}

export function TestWrapper({
  children,
  queryClient = createTestQueryClient(),
  initialEntries = ['/'],
}: WrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: Partial<WrapperProps> = {}
) {
  return {
    ...render(ui, {
      wrapper: ({ children }: WrapperRenderProps) => (
        <TestWrapper {...options}>
          {children}
        </TestWrapper>
      ),
    } as RenderOptions),
  };
} 