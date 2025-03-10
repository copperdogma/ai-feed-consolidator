import { initializeApp, cert, getApps, getApp, AppOptions } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger';
import { User } from '../../types/user';
import * as fs from 'fs';
import { DecodedIdToken } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
try {
  // Log the environment we're running in
  logger.info(`Initializing Firebase Admin SDK in ${process.env.NODE_ENV} environment`);
  
  // Check if the app is already initialized
  if (!getApps().length) {
    let credential;
    let appOptions: AppOptions = {};
    
    // Option 1: Use FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = cert(serviceAccountJson);
        logger.info('Using Firebase credentials from FIREBASE_SERVICE_ACCOUNT environment variable');
        appOptions.credential = credential;
      } catch (e) {
        logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
        throw e;
      }
    } 
    // Option 2: Use FIREBASE_SERVICE_ACCOUNT_PATH environment variable (path to JSON file)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (!fs.existsSync(serviceAccountPath)) {
          throw new Error(`Service account file not found at: ${serviceAccountPath}`);
        }
        const serviceAccountJson = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = cert(serviceAccountJson);
        logger.info(`Using Firebase credentials from file: ${serviceAccountPath}`);
        appOptions.credential = credential;
      } catch (e) {
        logger.error('Failed to load service account from file:', e);
        throw e;
      }
    }
    // Option 3: Use Application Default Credentials (set via GOOGLE_APPLICATION_CREDENTIALS)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // When GOOGLE_APPLICATION_CREDENTIALS is set, the SDK will use it automatically
      logger.info(`Using Application Default Credentials from GOOGLE_APPLICATION_CREDENTIALS`);
      // We don't need to explicitly set the credential, the SDK will use ADC
    } else {
      logger.warn('No explicit Firebase credentials provided. Attempting to use Application Default Credentials.');
      logger.warn('If running locally, set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
    }

    // Initialize the app with the appropriate options
    initializeApp(appOptions);
    
    logger.info('Firebase Admin SDK initialized successfully');
  } else {
    logger.info('Firebase Admin SDK already initialized');
  }
} catch (error) {
  logger.error('Error initializing Firebase Admin SDK:', error);
  // Log more details about the error
  if (error instanceof Error) {
    logger.error(`Error name: ${error.name}, message: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
  }
  
  // Provide guidance on how to fix common issues
  logger.error('Make sure you have set up Firebase Admin SDK credentials correctly:');
  logger.error('1. For local development, download a service account key from the Firebase Console');
  logger.error('2. Set GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-file.json"');
  logger.error('3. Or set FIREBASE_SERVICE_ACCOUNT with the JSON content as a string in .env.local');
  logger.error('4. Or set FIREBASE_SERVICE_ACCOUNT_PATH with the path to the JSON file');
  
  throw error;
}

/**
 * Verify a Firebase ID token
 * @param idToken The ID token to verify
 * @returns The decoded token if valid, null otherwise
 */
export const verifyIdToken = async (idToken: string): Promise<DecodedIdToken | null> => {
  try {
    logger.debug(`Verifying ID token (length: ${idToken.length})`);
    
    // Get the Firebase Auth instance
    const auth = getAuth();
    
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    logger.debug(`Token verified successfully for user: ${decodedToken.email || decodedToken.uid}`);
    logger.debug(`Token payload: uid=${decodedToken.uid}, email=${decodedToken.email || 'none'}, email_verified=${decodedToken.email_verified}`);
    
    return decodedToken;
  } catch (error) {
    logger.error('Error verifying ID token:', error);
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`);
      
      // Log specific Firebase Auth error codes
      if (error.message.includes('expired')) {
        logger.error('Token has expired. User needs to reauthenticate.');
      } else if (error.message.includes('invalid')) {
        logger.error('Token is invalid. Possible tampering or incorrect format.');
      } else if (error.message.includes('revoked')) {
        logger.error('Token has been revoked. User needs to reauthenticate.');
      }
      
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
    }
    return null;
  }
};

/**
 * Find or create a user based on Firebase authentication
 * @param decodedToken Decoded Firebase ID token
 * @param db Database client
 * @returns User object
 */
export const findOrCreateFirebaseUser = async (
  decodedToken: any,
  db: any
): Promise<User | null> => {
  try {
    // First, try to find the user by firebase_uid
    const existingUser = await db.oneOrNone(
      'SELECT * FROM users WHERE google_id = $1',
      [decodedToken.uid]
    );

    if (existingUser) {
      return existingUser;
    }

    // If user doesn't exist, create a new one
    const now = new Date();
    const newUser = await db.one(
      `INSERT INTO users 
       (google_id, email, display_name, avatar_url, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        decodedToken.uid,
        decodedToken.email || '',
        decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        decodedToken.picture || null,
        now,
        now,
      ]
    );

    // Create default user preferences
    await db.none(
      `INSERT INTO user_preferences 
       (user_id, theme, email_notifications, content_language, summary_level, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newUser.id, 'light', true, 'en', 1, now, now]
    );

    logger.info(`Created new user with ID: ${newUser.id}`);
    return newUser;
  } catch (error) {
    logger.error('Error finding or creating Firebase user:', error);
    return null;
  }
}; 