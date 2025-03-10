import React, { useEffect } from 'react';
import { Button, Container, Typography, Box, Paper, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { signIn, loading, error, user, isRedirecting } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to the main page
  useEffect(() => {
    if (user) {
      console.log('User authenticated, redirecting to main page');
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      console.log('Initiating Google login...');
      await signIn();
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  // If user is authenticated and we're in the process of redirecting, show a loading state
  if (user) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Redirecting to your dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  // If we're redirecting to Google for authentication
  if (isRedirecting) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Redirecting to Google for authentication...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You'll be redirected to Google's login page. After signing in, you'll be returned to this application.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5" gutterBottom>
            AI Feed Consolidator
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to access your personalized content feed
          </Typography>

          {error && error !== 'Server verification failed' && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading || isRedirecting}
            fullWidth
            sx={{ mt: 2 }}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 