/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Avatar,
  Grid,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { FeedItemCard } from './components/FeedItemCard';
import { ProcessedFeedItem } from './server/types/feed';
import GoogleIcon from '@mui/icons-material/Google';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import config from './config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { FeedManagement } from './components/FeedManagement';

interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  feedly_access_token?: string;
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

const ContentBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: theme.spacing(3),
  padding: theme.spacing(4),
  maxWidth: 800,
  width: '100%',
  backgroundColor: '#fff',
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  '& .MuiAvatar-root': {
    width: 128,
    height: 128,
    marginBottom: theme.spacing(2)
  }
}));

const queryClient = new QueryClient();

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<ProcessedFeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3003/api/auth/verify', {
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) return res.json() as Promise<AuthResponse>;
        throw new Error('Not authenticated');
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const loadFeedItems = useCallback(async () => {
    if (!user) return;
    setLoadingFeed(true);
    try {
      const response = await fetch(`${config.serverUrl}/api/feed/items`, {
        credentials: 'include'
      });

      if (!response) {
        console.error('No response received from server');
        setFeedItems([]);
        return;
      }

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        setFeedItems([]);
        return;
      }

      const data = await response.json();
      setFeedItems(data);
    } catch (error) {
      console.error('Error loading feed items:', error);
      setFeedItems([]);
    } finally {
      setLoadingFeed(false);
    }
  }, [user]);

  useEffect(() => {
    loadFeedItems();
  }, [loadFeedItems]);

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
        <FeedManagement />
        <PageContainer>
          <ContentBox>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Welcome, {user.display_name || 'User'}!
              </Typography>
              {user.avatar_url && (
                <Avatar
                  src={user.avatar_url}
                  alt={user.display_name || 'Profile'}
                  imgProps={{ referrerPolicy: 'no-referrer' }}
                />
              )}
              {!user.feedly_access_token && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => window.location.href = `${config.serverUrl}/api/auth/feedly`}
                  startIcon={<RssFeedIcon />}
                  sx={{ mt: 2 }}
                >
                  Connect Feedly Account
                </Button>
              )}
            </Box>

            {loadingFeed ? (
              <CircularProgress />
            ) : feedItems.length > 0 ? (
              <Box sx={{ width: '100%' }}>
                {feedItems.map(item => (
                  <FeedItemCard 
                    key={item.id} 
                    item={item} 
                    onRefresh={loadFeedItems}
                  />
                ))}
              </Box>
            ) : (
              <Typography>No feed items available</Typography>
            )}

            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.location.href = `${config.serverUrl}${config.auth.logoutPath}`}
              sx={{ mt: 2 }}
            >
              Logout
            </Button>
          </ContentBox>
        </PageContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
