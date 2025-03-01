import { Pool } from 'pg';
import { IDatabase } from 'pg-promise';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import type { User } from '../../types/user';
import { UserService } from './user-service';
import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';
import { TransactionManager } from './transaction-manager';

export class GoogleAuthService {
  private pool: IDatabase<any>;
  private transactionManager: TransactionManager;
  private userService: UserService;
  private static instance: GoogleAuthService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
    this.transactionManager = serviceContainer.getService<TransactionManager>('transactionManager');
    this.userService = serviceContainer.getService<UserService>('userService');
  }

  public static initialize(serviceContainer: IServiceContainer): void {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService(serviceContainer);
    }
  }

  public static resetForTesting(): void {
    GoogleAuthService.instance = null;
  }

  public static getInstance(serviceContainer: IServiceContainer): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      if (!serviceContainer) {
        throw new Error('GoogleAuthService not initialized');
      }
      GoogleAuthService.instance = new GoogleAuthService(serviceContainer);
    }
    return GoogleAuthService.instance;
  }

  async findOrCreateGoogleUser(profile: GoogleProfile): Promise<User> {
    try {
      // First try to find existing user by Google ID
      const existingUserByGoogleId = await this.userService.findByGoogleId(profile.id);
      if (existingUserByGoogleId) {
        return existingUserByGoogleId;
      }

      // If no user found by Google ID, check by email
      const email = profile.emails?.[0]?.value;
      if (!email) {
        throw new Error('Email is required for Google authentication');
      }

      const existingUserByEmail = await this.userService.findByEmail(email);
      if (existingUserByEmail) {
        // Update the existing user with Google ID and return
        return await this.userService.update(existingUserByEmail.id, {
          google_id: profile.id,
          display_name: profile.displayName || email.split('@')[0],
          avatar_url: profile.photos?.[0]?.value || null
        });
      }

      // If no user found at all, create a new one
      return await this.userService.create({
        google_id: profile.id,
        email,
        display_name: profile.displayName || email.split('@')[0],
        avatar_url: profile.photos?.[0]?.value || null
      });
    } catch (error) {
      logger.error({ err: error, profileId: profile.id }, 'Error in findOrCreateGoogleUser');
      throw error;
    }
  }

  /**
   * Update a user's Google profile information
   */
  async updateGoogleProfile(
    userId: number,
    profile: GoogleProfile
  ): Promise<{
    id: number;
    email: string;
    display_name: string;
    avatar_url: string | null;
  }> {
    try {
      const updates = {
        display_name: profile.displayName,
        avatar_url: profile.photos?.[0]?.value || null,
        email: profile.emails?.[0]?.value
      };

      const result = await this.pool.oneOrNone(
        `UPDATE users 
         SET display_name = $1,
             avatar_url = $2,
             email = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [updates.display_name, updates.avatar_url, updates.email, userId]
      );

      if (!result) {
        throw new Error(`User not found: ${userId}`);
      }

      return result as {
        id: number;
        email: string;
        display_name: string;
        avatar_url: string | null;
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error updating Google profile');
      throw error;
    }
  }

  /**
   * Link a Google account to an existing user
   */
  async linkGoogleAccount(userId: number, profile: GoogleProfile): Promise<boolean> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check if Google ID is already linked to another account
      const existingLinked = await this.userService.findByGoogleId(profile.id);
      if (existingLinked && existingLinked.id !== userId) {
        throw new Error('Google account already linked to another user');
      }

      // Link Google account
      const updated = await this.userService.update(userId, {
        google_id: profile.id
      });

      return !!updated;
    } catch (error) {
      logger.error({ error, userId, profileId: profile.id }, 'Error linking Google account');
      throw error;
    }
  }

  /**
   * Unlink a Google account from a user
   */
  async unlinkGoogleAccount(userId: number): Promise<boolean> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Log the current user state for debugging
      logger.debug({ 
        userId, 
        hasGoogleId: user?.google_id ? true : false, 
        googleId: user?.google_id 
      }, 'Attempting to unlink Google account');

      // Check if the user has a Google ID to unlink
      // Handle both null and undefined values
      if (!user.google_id) {
        logger.warn({ userId }, 'Cannot unlink Google account: Account not linked');
        throw new Error('Google account not linked');
      }

      const updated = await this.userService.update(userId, {
        google_id: null
      });

      return !!updated;
    } catch (error) {
      logger.error({ error, userId }, 'Error unlinking Google account');
      throw error;
    }
  }
} 