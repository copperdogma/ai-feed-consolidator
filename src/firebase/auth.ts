import { 
  GoogleAuthProvider, 
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  getIdToken,
  AuthError
} from 'firebase/auth';
import { auth } from './config';
import { User } from '../types/user';
import { config } from '../config';

// Create a Google Auth Provider
const googleProvider = new GoogleAuthProvider();
// Add scopes for better user profile access
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Set custom parameters for better compatibility
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google using a popup or redirect based on environment
 * @returns Promise that resolves with the user credentials
 */
export const signInWithGoogle = async () => {
  try {
    // Always use redirect method for more reliable cross-browser compatibility
    console.log('Signing in with Google using redirect method...');
    await signInWithRedirect(auth, googleProvider);
    // This won't be reached immediately as the page will redirect
    return null;
  } catch (error: unknown) {
    console.error('Error signing in with Google redirect', error);
    throw error;
  }
};

/**
 * Check for redirect result after returning from OAuth redirect
 * @returns Promise that resolves with the user credentials
 */
export const checkRedirectResult = async () => {
  try {
    console.log('Checking for redirect result...');
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('Redirect sign-in successful, user:', result.user.email);
      return result;
    }
    console.log('No redirect result found');
    return null;
  } catch (error: unknown) {
    console.error('Error getting redirect result', error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    console.error('Error signing out', error);
    throw error;
  }
};

/**
 * Get the current user's ID token
 * @returns Promise that resolves with the ID token
 */
export const getCurrentUserToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  try {
    return await getIdToken(user);
  } catch (error: unknown) {
    console.error('Error getting ID token', error);
    throw error;
  }
};

/**
 * Convert Firebase user to our app's User type
 * @param firebaseUser The Firebase user object
 * @returns User object for our application
 */
export const convertFirebaseUserToAppUser = (firebaseUser: FirebaseUser): User => {
  const now = new Date();
  
  return {
    id: 0, // This will be set by the server
    google_id: firebaseUser.uid,
    email: firebaseUser.email || '',
    display_name: firebaseUser.displayName || firebaseUser.email || 'Unknown User',
    avatar_url: firebaseUser.photoURL,
    created_at: now,
    updated_at: now,
  };
};

/**
 * Verify the user's authentication with the server
 * @returns Promise that resolves with the user data from the server
 */
export const verifyAuthWithServer = async (): Promise<User | null> => {
  try {
    const token = await getCurrentUserToken();
    
    if (!token) {
      console.log('No token available for server verification');
      return null;
    }
    
    const verifyUrl = `${config.serverUrl}/api/auth/verify`;
    console.log(`Verifying auth with server at ${verifyUrl}`);
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies if any
    });
    
    console.log('Server verification response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server verification failed:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('Server verification successful, received user data');
    return data.user;
  } catch (error: unknown) {
    console.error('Error verifying authentication with server', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    return null;
  }
};

/**
 * Set up an auth state listener
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const setupAuthListener = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Verify with server to get the complete user data
        const user = await verifyAuthWithServer();
        callback(user);
      } catch (error) {
        console.error('Error in auth state change handler', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}; 