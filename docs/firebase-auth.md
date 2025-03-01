# Firebase Authentication Implementation Guide

20240228: Created by Cam Marsollier with Claude 3.7 Sonnet

## Prerequisites
1. Node.js and npm installed
2. A Firebase project
3. A React + TypeScript project (using Vite)

## Firebase Authentication Configuration

### Firebase Console Setup
1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable Authentication service
4. Configure Sign-in methods:
   - Enable Google provider
   - Optionally enable other providers as needed
5. Set authorized domains:
   - Add `localhost` for development
   - Add production domains when ready for deployment

### Firebase Web SDK Setup
The client application uses Firebase Web SDK (v9) for authentication:

```typescript
// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
```

### Authentication Methods
The application uses popup-based Google authentication with a redirect fallback:

```typescript
// src/firebase/auth.ts
import { 
  GoogleAuthProvider, 
  signInWithRedirect,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from './config';

// Create a Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');

/**
 * Sign in with Google using a popup or redirect based on environment
 */
export const signInWithGoogle = async () => {
  try {
    // Use popup method for more reliable authentication
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    // Fallback to redirect if popup is blocked
    if (error instanceof Error && 
        error.message.includes('popup') && 
        error.message.includes('blocked')) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = () => {
  return signOut(auth);
};
```

## Firebase Admin SDK (Server-side)
The server uses Firebase Admin SDK to verify authentication tokens:

```typescript
// src/server/auth/firebase-admin.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
try {
  if (!getApps().length) {
    let credential;
    let appOptions = {};
    
    // Option 1: Use FIREBASE_SERVICE_ACCOUNT environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(serviceAccountJson);
      appOptions.credential = credential;
    }
    // Option 2: Use GOOGLE_APPLICATION_CREDENTIALS path
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const serviceAccountContents = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccountJson = JSON.parse(serviceAccountContents);
      credential = cert(serviceAccountJson);
      appOptions.credential = credential;
    }
    // Option 3: Use Firebase project configuration
    else {
      appOptions = {
        projectId: process.env.FIREBASE_PROJECT_ID,
      };
    }
    
    // Initialize the app
    initializeApp(appOptions);
  }
} catch (error) {
  logger.error('Firebase Admin SDK initialization error:', error);
  throw error;
}

// Export Firebase Admin Auth instance
export const auth = getAuth();

/**
 * Verify Firebase ID token
 */
export const verifyIdToken = async (idToken: string) => {
  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    logger.error('Error verifying Firebase ID token:', error);
    throw error;
  }
};
```

## Authentication Middleware
Express middleware to authenticate requests using Firebase:

```typescript
// src/server/auth/middleware.ts
export const firebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for public routes
  if (isPublicRoute(req.path)) {
    return next();
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('No valid Authorization header found');
      req.user = undefined;
      return next();
    }

    // Extract the token
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      logger.debug('No token found in Authorization header');
      req.user = undefined;
      return next();
    }

    // Verify the token
    const decodedToken = await verifyIdToken(idToken);
    
    // Get or create user in the database
    const user = await getUserService().findOrCreateUserByFirebaseId(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || decodedToken.email || 'Unknown User',
      decodedToken.picture
    );

    // Attach user to request
    req.user = user;
    req.isAuthenticated = function() {
      return !!req.user;
    };
    
    next();
  } catch (error) {
    logger.error('Error in firebaseAuth middleware:', error);
    req.user = undefined;
    next();
  }
};
```

## Frontend Integration
React contexts to manage authentication state:

```typescript
// src/components/auth/AuthProvider.tsx
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  useEffect(() => {
    // Handle auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Verify with server to get complete user data
          const user = await verifyAuthWithServer();
          setUser(user);
        } catch (err) {
          setError('Failed to authenticate with server');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    // Check for redirect result on initial load
    checkRedirectResult().catch(console.error);
    
    return () => unsubscribe();
  }, []);
  
  const signIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError('Authentication failed');
      console.error('Sign in error:', err);
    }
  };
  
  const signOut = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (err) {
      setError('Sign out failed');
      console.error('Sign out error:', err);
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, loading, error, isRedirecting, signIn, signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Environment Setup
1. Create a `.env` file in your project root:
```env
# Firebase Web SDK (Client-side)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side)
# Option 1: JSON string of service account credentials
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Option 2: Path to service account file
# GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json

# Option 3: Project ID (relies on Application Default Credentials)
# FIREBASE_PROJECT_ID=your_project_id
```

2. Create `.env.example` as a template (without real values)

## Security Considerations
1. Store Firebase configuration in environment variables
2. Never commit `.env` or service account keys to version control
3. Use secure Firebase Rules for data access
4. Implement proper server-side validation
5. Use HTTPS in production
6. Protect sensitive routes with authentication middleware
7. Implement rate limiting for authentication attempts
8. Regularly rotate service account keys
9. Monitor Firebase Auth events for suspicious activity

## References
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Web SDK Documentation](https://firebase.google.com/docs/web/setup) 