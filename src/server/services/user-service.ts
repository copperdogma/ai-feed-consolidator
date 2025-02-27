import { PoolClient } from 'pg';
import type { User, UserPreferences } from '../../types/user';
import { TransactionManager } from './transaction-manager';
import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';
import { IDatabase } from 'pg-promise';

export class UserService {
  private pool: IDatabase<any>;
  private transactionManager: TransactionManager;
  private static instance: UserService | null = null;

  constructor(private container: IServiceContainer) {
    if (!container) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = container.getPool();
    this.transactionManager = container.getService<TransactionManager>('transactionManager');
  }

  public static initialize(container: IServiceContainer): void {
    if (!UserService.instance) {
      UserService.instance = new UserService(container);
    }
  }

  public static getInstance(container: IServiceContainer): UserService {
    if (!UserService.instance) {
      if (!container) {
        throw new Error('UserService not initialized');
      }
      UserService.instance = new UserService(container);
    }
    return UserService.instance;
  }

  /**
   * Find a user by their ID
   */
  async findById(id: number): Promise<User | null> {
    try {
      const result = await this.pool.oneOrNone<User>('SELECT * FROM users WHERE id = $1', [id]);
      return result || null;
    } catch (error) {
      logger.error({ err: error }, 'Error finding user by ID');
      throw error;
    }
  }

  /**
   * Find a user by their email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.pool.oneOrNone<User>('SELECT * FROM users WHERE email = $1', [email]);
      return result || null;
    } catch (error) {
      logger.error({ error, email }, 'Error finding user by email');
      throw error;
    }
  }

  /**
   * Find a user by their Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      // Add logging for debugging
      logger.debug({ googleId }, 'Finding user by Google ID');
      
      // Use the pg-promise oneOrNone method which returns the first row or null
      const result = await this.pool.oneOrNone<User>('SELECT * FROM users WHERE google_id = $1', [googleId]);
      return result || null;
    } catch (error) {
      logger.error({ error, googleId }, 'Error finding user by Google ID');
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async create(userData: Partial<User>): Promise<User> {
    try {
      const { google_id, email, display_name, avatar_url } = userData;
      
      if (!email) {
        throw new Error('Email is required');
      }

      const result = await this.pool.one<User>(
        `INSERT INTO users (
          google_id, email, display_name, avatar_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *`,
        [google_id, email, display_name, avatar_url]
      );

      return result;
    } catch (error) {
      logger.error({ error, userData }, 'Error creating user');
      throw error;
    }
  }

  /**
   * Update a user's information
   */
  async update(id: number, updates: Partial<User>): Promise<User | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Allow updating all non-sensitive fields
      const allowedFields = ['google_id', 'display_name', 'email', 'avatar_url'];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (allowedFields.includes(key)) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        return null;
      }

      values.push(id);

      const result = await this.pool.oneOrNone<User>(
        `UPDATE users 
         SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      return result;
    } catch (error) {
      logger.error({ error, userId: id, updates }, 'Error updating user');
      throw error;
    }
  }

  /**
   * Delete a user and all their associated data
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete in order to respect foreign key constraints
      await this.pool.none('DELETE FROM user_preferences WHERE user_id = $1', [id]);
      await this.pool.none('DELETE FROM item_states WHERE user_id = $1', [id]);
      await this.pool.none('DELETE FROM feed_configs WHERE user_id = $1', [id]);
      
      const result = await this.pool.result(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error({ error, userId: id }, 'Error deleting user');
      throw error;
    }
  }

  /**
   * Validate a user exists and has required fields
   */
  async validateUser(id: number): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const user = await this.pool.oneOrNone<User>('SELECT * FROM users WHERE id = $1', [id]);

      if (!user) {
        return {
          valid: false,
          errors: ['User not found']
        };
      }

      const errors: string[] = [];

      if (!user.email) {
        errors.push('Email is required');
      }
      if (!user.display_name) {
        errors.push('Display name is required');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error({ error, userId: id }, 'Error validating user');
      throw error;
    }
  }

  async getUserProfile(userId: number): Promise<{ user: User; preferences: UserPreferences[] } | null> {
    try {
      return await this.transactionManager.withWriteTransaction(async (client: PoolClient) => {
        // Get user
        const userResult = await client.query<User>(
          'SELECT * FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return null;
        }

        const user = userResult.rows[0];

        // Get preferences
        const preferencesResult = await client.query<UserPreferences>(
          'SELECT * FROM user_preferences WHERE user_id = $1',
          [userId]
        );
        let preferences = preferencesResult.rows;

        // Create default preferences if none exist
        if (preferences.length === 0) {
          const defaultPreferences = {
            theme: 'light',
            email_notifications: true,
            content_language: 'en',
            summary_level: 1
          };

          const newPrefsResult = await client.query<UserPreferences>(
            `INSERT INTO user_preferences (
              user_id, 
              theme, 
              email_notifications, 
              content_language, 
              summary_level,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING *`,
            [
              userId, 
              defaultPreferences.theme, 
              defaultPreferences.email_notifications, 
              defaultPreferences.content_language, 
              defaultPreferences.summary_level
            ]
          );

          preferences = newPrefsResult.rows;
        }

        return {
          user,
          preferences
        };
      });
    } catch (error) {
      logger.error({ error, userId }, 'Error getting user profile');
      throw error;
    }
  }
} 