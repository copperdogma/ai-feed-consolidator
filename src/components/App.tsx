import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Button, Container, Alert, Stack, CircularProgress } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { FeedDisplay } from './FeedDisplay';
import { config } from '../config';
import { theme } from '../theme';
import { queryClient } from '../queryClient';
import GoogleIcon from '@mui/icons-material/Google';
import { User } from '../types/user';

interface AuthResponse {
  authenticated: boolean;
  user: User | null;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let abortController = new AbortController();

    const verifyAuth = async () => {
      try {
        const res = await fetch(`${config.serverUrl}/api/auth/verify`, {
          signal: abortController.signal
        });
        
        if (!mounted) return;
        
        if (res.ok) {
          const data = await res.json() as AuthResponse;
          if (mounted) {
            setUser(data.authenticated ? data.user : null);
          }
        } else {
          if (mounted) {
            setUser(null);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Ignore abort errors
        }
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    verifyAuth();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []); // Empty dependency array since we only want this to run once on mount

  const handleLogout = async () => {
    try {
      const response = await fetch(`${config.serverUrl}${config.auth.logoutPath}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Error logging out');
        return; // Keep user logged in if there's an error
      }
      
      // Only clear error and user state on successful logout
      setError(null);
      setUser(null);
      // Only redirect on successful logout
      window.location.href = `${config.serverUrl}/`;
    } catch (err) {
      setError('Error logging out');
      // Keep user logged in on error
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                AI Feed Consolidator
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {user ? (
                  <>
                    <Typography variant="h6" data-testid="welcome-message">
                      Welcome, {user.display_name}!
                    </Typography>
                    <Button
                      color="inherit"
                      onClick={handleLogout}
                      data-testid="logout-button"
                    >
                      Log Out
                    </Button>
                  </>
                ) : (
                  <Button
                    color="inherit"
                    href={`${config.serverUrl}${config.auth.googleAuthPath}`}
                    startIcon={<GoogleIcon />}
                    data-testid="login-button-header"
                  >
                    Log In with Google
                  </Button>
                )}
              </Box>
            </Toolbar>
          </AppBar>
          {error && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error" data-testid="error-message">
                {error}
              </Alert>
            </Box>
          )}
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {user ? (
              <FeedDisplay />
            ) : (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="h3" gutterBottom>
                  Welcome to AI Feed Consolidator
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Please log in to continue
                </Typography>
                <Stack spacing={2} alignItems="center" mt={4}>
                  <Button
                    variant="contained"
                    startIcon={<GoogleIcon />}
                    href={`${config.serverUrl}${config.auth.googleAuthPath}`}
                    data-testid="login-button-main"
                  >
                    Log in with Google
                  </Button>
                </Stack>
              </Box>
            )}
          </Container>
        </Box>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App; 