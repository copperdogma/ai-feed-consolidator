import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../types/user';
import { auth } from '../../firebase/config';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { signInWithGoogle, signOutUser, verifyAuthWithServer, checkRedirectResult } from '../../firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for redirect result on initial load
  useEffect(() => {
    const checkForRedirect = async () => {
      try {
        const result = await checkRedirectResult();
        if (result) {
          console.log('Redirect authentication successful');
          // The auth state listener will handle setting the user
        }
      } catch (err) {
        console.error('Redirect authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      }
    };
    
    checkForRedirect();
  }, []);

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          console.log('Firebase user authenticated:', firebaseUser.email);
          
          // Verify with our server and get the user data
          const serverUser = await verifyAuthWithServer();
          setUser(serverUser);
        } else {
          // User is signed out
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // The auth state listener will handle setting the user
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOutUser();
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 