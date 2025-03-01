import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../types/user';
import { auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { signInWithGoogle, signOutUser, verifyAuthWithServer, checkRedirectResult } from '../../firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isRedirecting: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isRedirecting: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);

  // Check for redirect result on initial load
  useEffect(() => {
    const checkForRedirect = async () => {
      try {
        console.log('Checking for redirect result...');
        setLoading(true);
        const result = await checkRedirectResult();
        if (result) {
          console.log('Redirect authentication successful, user:', result.user.email);
          // We'll let the auth state listener handle setting the user
        } else {
          console.log('No redirect result found');
        }
      } catch (err) {
        console.error('Redirect authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        // Ensure loading and redirecting states are updated
        setLoading(false);
        setIsRedirecting(false);
        setRedirectChecked(true);
      }
    };
    
    checkForRedirect();
  }, []);

  // Handle Firebase auth state changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed, user:', firebaseUser?.email || 'none');
      
      try {
        if (firebaseUser) {
          // User is signed in
          console.log('Firebase user authenticated, verifying with server...');
          setLoading(true);
          
          // Verify with our server and get the user data
          const serverUser = await verifyAuthWithServer();
          
          if (serverUser) {
            console.log('Server verification successful, user:', serverUser.email);
            setUser(serverUser);
            setError(null); // Clear any previous errors
          } else {
            console.error('Server verification failed, no user returned');
            setError('Server verification failed');
            setUser(null);
          }
        } else {
          // User is signed out
          console.log('User is signed out');
          setUser(null);
          setError(null); // Don't show error for unauthenticated users
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        setUser(null);
      } finally {
        setLoading(false);
        // Also ensure redirecting state is reset
        setIsRedirecting(false);
      }
    });

    // Cleanup subscription
    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRedirecting(true);
      console.log('Starting sign in process...');
      await signInWithGoogle();
      console.log('Sign in function completed');
      // The auth state listener will handle setting the user
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setLoading(false);
      setIsRedirecting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      console.log('Starting sign out process...');
      await signOutUser();
      setUser(null);
      console.log('Sign out completed');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  // Log state changes for debugging
  useEffect(() => {
    console.log('Auth state updated:', { 
      isAuthenticated: !!user, 
      loading, 
      hasError: !!error,
      isRedirecting,
      redirectChecked
    });
  }, [user, loading, error, isRedirecting, redirectChecked]);

  const value = {
    user,
    loading,
    error,
    isRedirecting,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 