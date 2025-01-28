/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import config from './config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { FeedManagement } from './components/FeedManagement';
import { FeedDisplay } from './components/FeedDisplay';

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

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/verify')
      .then(res => {
        if (res.ok) return res.json() as Promise<AuthResponse>;
        throw new Error('Not authenticated');
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${config.serverUrl}${config.auth.logoutPath}`);
      if (!response.ok) {
        setError('Error logging out');
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setError('Error logging out');
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

  if (!user) {
    return (
      <PageContainer>
        <ContentBox>
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
            >
              Log in with Google
            </Button>
          </Stack>
        </ContentBox>
      </PageContainer>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PageContainer>
          <ContentBox>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Welcome, {user.display_name || 'User'}!
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                {user.avatar_url && (
                  <Avatar
                    src={user.avatar_url}
                    alt={user.display_name || 'Profile'}
                    imgProps={{ referrerPolicy: 'no-referrer' }}
                  />
                )}
                <Button
                  variant="outlined"
                  onClick={handleLogout}
                  sx={{ ml: 2 }}
                >
                  Log Out
                </Button>
              </Box>
            </Box>
            <FeedManagement />
            <Box sx={{ mt: 4 }}>
              <FeedDisplay queryClient={queryClient} />
            </Box>
          </ContentBox>
        </PageContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
