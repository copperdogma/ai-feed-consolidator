import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  getIdToken
} from 'firebase/auth';
import { auth } from './config';
import { User } from '../types/user';
import { config } from '../config';

// Create a Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google using a popup
 * @returns Promise that resolves with the user credentials
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error('Error signing in with Google', error);
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
  } catch (error) {
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
  } catch (error) {
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
      return null;
    }
    
    const response = await fetch(`${config.serverUrl}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error verifying authentication with server', error);
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