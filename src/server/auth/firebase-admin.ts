import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { User } from '../../types/user';

// Initialize Firebase Admin SDK
// Note: In production, you should use environment variables or secret management
// for the service account credentials
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // If using environment variables for service account:
      // credential: admin.credential.cert({
      //   projectId: process.env.FIREBASE_PROJECT_ID,
      //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      // }),
      
      // For development, we can use the application default credentials
      credential: admin.credential.applicationDefault(),
    });
    
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Verify a Firebase ID token and return the decoded token
 * @param idToken Firebase ID token to verify
 * @returns Decoded token or null if verification fails
 */
export const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('Error verifying Firebase ID token:', error);
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
  decodedToken: admin.auth.DecodedIdToken,
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

export default admin; 