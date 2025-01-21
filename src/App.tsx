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
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%'
});

const ContentBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: theme.spacing(3),
  padding: theme.spacing(4),
  maxWidth: 400,
  width: '90%',
  backgroundColor: '#fff',
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  '& .MuiAvatar-root': {
    width: 128,
    height: 128,
    marginBottom: theme.spacing(2)
  },
  '& .MuiTypography-root': {
    maxWidth: '100%'
  }
}));

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Welcome to AI Feed Consolidator
          </Typography>
          <Typography variant="body1" gutterBottom align="center">
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
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Welcome, {user.display_name || 'User'}!
        </Typography>
        {user.avatar_url && (
          <Avatar
            src={user.avatar_url}
            alt={user.display_name || 'Profile'}
            imgProps={{ referrerPolicy: 'no-referrer' }}
          />
        )}
        <Typography variant="body1" align="center">Email: {user.email}</Typography>
        <Button
          href="/auth/logout"
          variant="outlined"
          color="primary"
        >
          Logout
        </Button>
      </ContentBox>
    </PageContainer>
  );
}

export default App;
