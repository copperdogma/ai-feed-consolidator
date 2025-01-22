/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Avatar,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { FeedItemCard } from './components/FeedItemCard';
import { ProcessedFeedItem } from './server/types/feed';

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

  useEffect(() => {
    if (user) {
      setLoadingFeed(true);
      fetch('http://localhost:3003/api/feed/items', {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => setFeedItems(data))
        .catch(console.error)
        .finally(() => setLoadingFeed(false));
    }
  }, [user]);

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
          <Button
            href="/auth/google"
            variant="contained"
            size="large"
            color="primary"
          >
            Sign in with Google
          </Button>
        </ContentBox>
      </PageContainer>
    );
  }

  return (
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
        </Box>

        {loadingFeed ? (
          <CircularProgress />
        ) : feedItems.length > 0 ? (
          <Box sx={{ width: '100%' }}>
            {feedItems.map(item => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </Box>
        ) : (
          <Typography>No feed items available</Typography>
        )}

        <Button
          href="/auth/logout"
          variant="outlined"
          color="primary"
          sx={{ mt: 2 }}
        >
          Logout
        </Button>
      </ContentBox>
    </PageContainer>
  );
}

export default App;
