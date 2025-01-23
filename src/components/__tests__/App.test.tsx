import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App Authentication', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Mock window.location.href to prevent actual navigation
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:5173' },
      writable: true
    });
  });

  it('should show login button when not authenticated', async () => {
    // Mock failed auth check
    mockFetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Not authenticated'))
    );

    render(<App />);

    // Should show loading initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Should show login button after auth check fails
    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  it('should show user profile when authenticated', async () => {
    const mockUser = {
      id: 1,
      google_id: 'test123',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'https://example.com/photo.jpg'
    };

    // Mock successful auth check
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

    render(<App />);

    // Should show loading initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Should show user profile after auth check succeeds
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', mockUser.avatar_url);
    });
  });

  it('should handle auth check errors gracefully', async () => {
    // Mock network error
    mockFetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );

    render(<App />);

    // Should show login button after error
    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  it('should have correct login link', async () => {
    mockFetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Not authenticated'))
    );

    render(<App />);

    await waitFor(() => {
      const loginButton = screen.getByText('Sign in with Google');
      expect(loginButton).toHaveAttribute('href', '/auth/google');
    });
  });

  it('should have correct logout link when authenticated', async () => {
    const mockUser = {
      id: 1,
      google_id: 'test123',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'https://example.com/photo.jpg'
    };

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

    render(<App />);

    await waitFor(() => {
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toHaveAttribute('href', '/auth/logout');
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
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
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
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();

      // Second logout attempt
      window.location.href = '/auth/logout';
      
      // Force a re-render and re-run of the useEffect
      rerender(<App key="second-logout" />);

      // Should still be in logged out state
      await waitFor(() => {
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
      });
    });
  });
}); 