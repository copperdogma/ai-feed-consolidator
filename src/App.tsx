/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Avatar,
  Stack,
  AppBar,
  Toolbar,
  Container,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import config from './config';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { FeedManagement } from './components/feed-management/FeedManagement';
import { FeedDisplay } from './components/FeedDisplay';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './queryClient';

interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthResponse {
  authenticated: boolean;
  user: User;
}

const PageContainer = styled('div')({
  minHeight: '100%',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  width: '100%',
  padding: '2rem'
});

const ContentBox = styled(Box)({
  maxWidth: '800px',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
});

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
    return (
      <PageContainer>
        <ContentBox>
          <CircularProgress />
        </ContentBox>
      </PageContainer>
    );
  }

  const errorMessage = error && (
    <Box sx={{ p: 2, bgcolor: 'error.main', color: 'error.contrastText' }}>
      <Typography data-testid="error-message">
        {error}
      </Typography>
    </Box>
  );

  if (!user) {
    return (
      <PageContainer>
        <ContentBox>
          {errorMessage}
          <Typography variant="h3" component="h1" gutterBottom>
            Welcome to AI Feed Consolidator
          </Typography>
          <Typography variant="body1" gutterBottom>
            Please log in to continue
          </Typography>
          <Stack spacing={2} direction="column" alignItems="center">
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = `${config.serverUrl}${config.auth.googleAuthPath}`}
              startIcon={<GoogleIcon />}
              data-testid="login-button"
            >
              Log in with Google
            </Button>
          </Stack>
        </ContentBox>
      </PageContainer>
    );
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
                    data-testid="login-button"
                  >
                    Log In with Google
                  </Button>
                )}
              </Box>
            </Toolbar>
          </AppBar>
          {errorMessage}
          <Container maxWidth="lg" sx={{ mt: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : user ? (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FeedManagement />
                </Grid>
                <Grid item xs={12}>
                  <FeedDisplay />
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  Welcome to AI Feed Consolidator
                </Typography>
                <Typography variant="body1">
                  Please log in to access your feeds.
                </Typography>
              </Box>
            )}
          </Container>
        </Box>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
