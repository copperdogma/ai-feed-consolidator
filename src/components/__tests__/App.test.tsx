import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../App';
import config from '../../config';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: 'http://localhost:5173',
};

Object.defineProperty(window, 'location', {
  value: {
    ...mockLocation,
    set href(url: string) {
      // If the URL is just '/', append it to the base URL
      if (url === '/') {
        mockLocation.href = 'http://localhost:5173/';
      } else {
        mockLocation.href = url;
      }
    },
    get href() {
      return mockLocation.href;
    }
  },
  writable: true,
  configurable: true
});

describe('App Authentication', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 1,
    google_id: '123',
    email: 'test@example.com',
    display_name: 'Test User',
    avatar_url: 'https://example.com/photo.jpg',
  };

  const getWelcomeText = () => screen.getByText((content, element) => {
    const hasText = (node: Element | null) => node?.textContent === 'Welcome, Test User!';
    const elementHasText = hasText(element);
    return elementHasText;
  });

  // Helper function to find welcome message
  const findWelcomeMessage = () => {
    return screen.getByRole('heading', { 
      name: new RegExp(`Welcome, ${mockUser.display_name}!`, 'i'),
      level: 1
    });
  };

  // Helper function to find logout button
  const findLogoutButton = () => {
    return screen.getByRole('button', { name: /log out/i });
  };

  beforeEach(() => {
    // Reset location href before each test
    mockLocation.href = 'http://localhost:5173';
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset all mocks before each test
    vi.clearAllMocks();

    // Reset fetch mock and set up default responses
    mockFetch.mockReset();
    mockFetch.mockImplementation((url) => {
      if (url === '/api/feed/items') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] })
        });
      }
      if (url === '/api/feeds') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url === '/api/auth/verify') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            authenticated: true,
            user: mockUser
          })
        });
      }
      if (url === '/api/auth/logout') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.reject(new Error(`Unhandled fetch to ${url}`));
    });

    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173'),
      writable: true,
    });
  });

  it('should show login button when not authenticated', async () => {
    // Mock auth check to return not authenticated
    mockFetch.mockImplementationOnce((url) => {
      if (url === '/api/auth/verify') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: false })
        });
      }
      return mockFetch(url);
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/log in with google/i)).toBeInTheDocument();
    });
  });

  it('should show user profile when authenticated', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(findWelcomeMessage()).toBeInTheDocument();
      expect(findLogoutButton()).toBeInTheDocument();
    });
  });

  it('should handle successful logout', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(findWelcomeMessage()).toBeInTheDocument();
    });

    const logoutButton = findLogoutButton();
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(window.location.href).toBe('http://localhost:5173/');
    });
  });

  it('should handle failed logout gracefully', async () => {
    // Mock failed logout
    mockFetch.mockImplementationOnce((url) => {
      if (url === '/api/auth/logout') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Logout failed' })
        });
      }
      return mockFetch(url);
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(findWelcomeMessage()).toBeInTheDocument();
    });

    const logoutButton = findLogoutButton();
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByText(/error logging out/i)).toBeInTheDocument();
    });
  });

  it('should have correct login link', async () => {
    // Mock auth check to return not authenticated
    mockFetch.mockImplementationOnce((url) => {
      if (url === '/api/auth/verify') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: false })
        });
      }
      return mockFetch(url);
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const loginButton = screen.getByRole('button', { name: /log in with google/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(window.location.href).toBe(`${config.serverUrl}${config.auth.googleAuthPath}`);
    });
  });

  it('should have correct logout link', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(findWelcomeMessage()).toBeInTheDocument();
    });

    const logoutButton = findLogoutButton();
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(window.location.href).toBe('http://localhost:5173/');
    });
  });

  describe('Logout Flow', () => {
    it('should show login screen after logout redirect', async () => {
      // Mock auth check to return not authenticated after logout
      mockFetch.mockImplementationOnce((url) => {
        if (url === '/api/auth/verify') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ authenticated: false })
          });
        }
        return mockFetch(url);
      });

      render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/log in with google/i)).toBeInTheDocument();
      });
    });

    it('should handle failed logout gracefully', async () => {
      // Mock failed logout
      mockFetch.mockImplementationOnce((url) => {
        if (url === '/api/auth/logout') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Logout failed' })
          });
        }
        return mockFetch(url);
      });

      render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(findWelcomeMessage()).toBeInTheDocument();
      });

      const logoutButton = findLogoutButton();
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText(/error logging out/i)).toBeInTheDocument();
      });
    });

    it('should handle multiple logout attempts', async () => {
      // Mock failed logout
      mockFetch.mockImplementation((url) => {
        if (url === '/api/auth/logout') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Logout failed' })
          });
        }
        if (url === '/api/feed/items') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [] })
          });
        }
        if (url === '/api/feeds') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
        if (url === '/api/auth/verify') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              authenticated: true,
              user: mockUser
            })
          });
        }
        return Promise.reject(new Error(`Unhandled fetch to ${url}`));
      });

      render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(findWelcomeMessage()).toBeInTheDocument();
      });

      const logoutButton = findLogoutButton();
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText(/error logging out/i)).toBeInTheDocument();
      });

      // Try logout again
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText(/error logging out/i)).toBeInTheDocument();
      });
    });
  });
}); 