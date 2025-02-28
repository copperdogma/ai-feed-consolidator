/** @jsxImportSource react */
import React from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  AppBar,
  Toolbar,
  Container,
  Grid,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { FeedManagement } from './components/feed-management/FeedManagement';
import { FeedDisplay } from './components/FeedDisplay';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './queryClient';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import Login from './components/auth/Login';

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

// Main app content that requires authentication
const AuthenticatedApp: React.FC = () => {
  const { user, loading, error, signOut } = useAuth();

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
    return <Login />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Feed Consolidator
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" data-testid="welcome-message">
              Welcome, {user.display_name}!
            </Typography>
            <Button
              color="inherit"
              onClick={signOut}
              data-testid="logout-button"
            >
              Log Out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      {errorMessage}
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FeedManagement />
          </Grid>
          <Grid item xs={12}>
            <FeedDisplay />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

// Root App component with providers
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
