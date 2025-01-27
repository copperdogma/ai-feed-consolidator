import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  value: mockLocation,
  writable: true,
});

describe('App Authentication', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockLocation.href = 'http://localhost:5173';
  });

  it('should show login button when not authenticated', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ authenticated: false }),
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/log in with google/i)).toBeInTheDocument();
    });
  });

  it('should show user profile when authenticated', async () => {
    const mockUser = {
      id: 1,
      google_id: '123',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    // Mock auth check
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ authenticated: true, user: mockUser }),
      })
    );

    // Mock feed items fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.display_name}!`)).toBeInTheDocument();
    });
  });

  it('should have correct login link', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ authenticated: false }),
      })
    );

    render(<App />);

    await waitFor(() => {
      const loginButton = screen.getByRole('button', { name: /log in with google/i });
      expect(loginButton).toBeInTheDocument();
      loginButton.click();
      expect(window.location.href).toBe(`${config.serverUrl}${config.auth.googleAuthPath}`);
    });
  });

  it('should have correct logout link', async () => {
    const mockUser = {
      id: 1,
      google_id: '123',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    // Mock auth check
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ authenticated: true, user: mockUser }),
      })
    );

    // Mock feed items fetch
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    render(<App />);

    await waitFor(() => {
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
      logoutButton.click();
      expect(window.location.href).toBe(`${config.serverUrl}${config.auth.logoutPath}`);
    });
  });

  describe('Logout Flow', () => {
    it('should show login screen after logout redirect', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg'
      };

      // Mock initial auth check
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: true, user: mockUser })
        })
      ).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Empty feed items
        })
      );

      // Mock auth check after logout
      mockFetch.mockImplementationOnce(() => 
        Promise.reject(new Error('Not authenticated'))
      );

      const { rerender } = render(<App />);

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
      });

      // Simulate logout redirect
      window.location.href = '/auth/logout';
      
      // Force a re-render and re-run of the useEffect
      rerender(<App key="rerender" />);

      // Wait for the auth check to complete
      await waitFor(() => {
        expect(screen.queryByText('Welcome, Test User!')).not.toBeInTheDocument();
      });

      // Verify logged out state
      expect(screen.getByText('Welcome to AI Feed Consolidator')).toBeInTheDocument();
      expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
      expect(screen.getByText('Log in with Google')).toBeInTheDocument();
    });

    it('should handle failed logout gracefully', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg'
      };

      // Mock initial auth check
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: true, user: mockUser })
        })
      ).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Empty feed items
        })
      );

      // Mock auth check after failed logout - still authenticated
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: true, user: mockUser })
        })
      ).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Empty feed items
        })
      );

      const { rerender } = render(<App />);

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
      });

      // Simulate failed logout
      window.location.href = '/auth/logout';
      
      // Force a re-render and re-run of the useEffect
      rerender(<App key="rerender" />);

      // Should still show profile
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
      });
    });

    it('should handle multiple logout attempts', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg'
      };

      // Mock initial auth check
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: true, user: mockUser })
        })
      ).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Empty feed items
        })
      );

      // Mock first auth check after logout
      mockFetch.mockImplementationOnce(() => 
        Promise.reject(new Error('Not authenticated'))
      );

      // Mock second auth check after logout
      mockFetch.mockImplementationOnce(() => 
        Promise.reject(new Error('Not authenticated'))
      );

      const { rerender } = render(<App />);

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
      });

      // First logout
      window.location.href = '/auth/logout';
      
      // Force a re-render and re-run of the useEffect
      rerender(<App key="first-logout" />);

      // Wait for the auth check to complete
      await waitFor(() => {
        expect(screen.queryByText('Welcome, Test User!')).not.toBeInTheDocument();
      });

      // Verify logged out state
      expect(screen.getByText('Welcome to AI Feed Consolidator')).toBeInTheDocument();
      expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
      expect(screen.getByText('Log in with Google')).toBeInTheDocument();

      // Second logout attempt
      window.location.href = '/auth/logout';
      
      // Force a re-render and re-run of the useEffect
      rerender(<App key="second-logout" />);

      // Should still be in logged out state
      await waitFor(() => {
        expect(screen.getByText('Log in with Google')).toBeInTheDocument();
      });
    });
  });
}); 