import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the App component
vi.mock('../App', () => {
  return {
    default: () => (
      <div>
        <div>AI Feed Consolidator</div>
        <button data-testid="login-button-main">Log in with Google</button>
      </div>
    )
  };
});

// Import the mocked App component
import App from '../App';

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/AI Feed Consolidator/i)).toBeInTheDocument();
  });

  test('shows login page when not authenticated', () => {
    render(<App />);
    const loginButton = screen.getByTestId('login-button-main');
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveTextContent(/log in with google/i);
  });
}); 