import { Pool, PoolClient } from 'pg';
import { TransactionManager } from './transaction-manager';
import pino from 'pino';
import { ServiceContainer } from './service-container';
import { initializeServiceContainer } from './service-container';
import { IServiceContainer } from './service-container.interface';

const logger = pino({ name: 'UserPreferencesService' });

export interface UserPreferences {
  id: number;
  user_id: number;
  theme: 'light' | 'dark';
  email_notifications: boolean;
  content_language: string;
  summary_level: number;
  created_at: Date;
  updated_at: Date;
}

export class UserPreferencesService {
  private pool: Pool;
  private transactionManager: TransactionManager;
  public static instance: UserPreferencesService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
    this.transactionManager = serviceContainer.getService<TransactionManager>('transactionManager');
  }

  public static initialize(serviceContainer: ServiceContainer): void {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService(serviceContainer);
    }
  }

  /**
   * Get user preferences, creating default ones if they don't exist
   */
  async getPreferences(userId: number, client?: PoolClient): Promise<UserPreferences> {
    if (client) {
      return this._getPreferencesWithClient(userId, client);
    } else {
      return await this.transactionManager.withWriteTransaction(async (client) => {
        return this._getPreferencesWithClient(userId, client);
      });
    }
  }

  private async _getPreferencesWithClient(userId: number, client: PoolClient): Promise<UserPreferences> {
    // Attempt to select existing preferences
    const result = await client.query<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    const rows = (result && Array.isArray(result.rows)) ? result.rows : [];
    if (rows.length > 0) {
      return rows[0];
    }

    // No existing preferences; create default preferences
    const defaultPreferences: Partial<UserPreferences> = {
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

    const newRows = (newPrefsResult && Array.isArray(newPrefsResult.rows)) ? newPrefsResult.rows : [];
    return newRows[0];
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: number,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      return await this.transactionManager.withWriteTransaction(async (client) => {
        // Get existing preferences using the helper
        const current = await this._getPreferencesWithClient(userId, client);

        // Build update query
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // Only allow updating specific fields
        const allowedFields = ['theme', 'email_notifications', 'content_language', 'summary_level'];
        
        Object.entries(updates).forEach(([key, value]) => {
          if (value !== undefined && allowedFields.includes(key)) {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        });

        if (updateFields.length === 0) {
          return current;
        }

        values.push(userId);

        const result = await client.query<UserPreferences>(
          `UPDATE user_preferences 
           SET ${updateFields.join(', ')}, updated_at = NOW()
           WHERE user_id = $${paramIndex}
           RETURNING *`,
          values
        );

        return result.rows[0];
      });
    } catch (error) {
      logger.error({ error, userId, updates }, 'Error updating user preferences');
      throw error;
    }
  }

  /**
   * Create default preferences for a user
   */
  async createDefaultPreferences(userId: number): Promise<UserPreferences> {
    try {
      return await this.transactionManager.withWriteTransaction(async (client) => {
        // Check if preferences already exist
        const existing = await client.query<UserPreferences>(
          'SELECT * FROM user_preferences WHERE user_id = $1',
          [userId]
        );

        if (existing.rows.length > 0) {
          return existing.rows[0];
        }

        const defaultPreferences = {
          theme: 'light',
          email_notifications: true,
          content_language: 'en',
          summary_level: 1
        };

        const result = await client.query<UserPreferences>(
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

        return result.rows[0];
      });
    } catch (error) {
      logger.error({ error, userId }, 'Error creating default preferences');
      throw error;
    }
  }

  /**
   * Validate user preferences
   */
  async validatePreferences(preferences: Partial<UserPreferences>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Theme validation
    if (preferences.theme !== undefined && !['light', 'dark'].includes(preferences.theme)) {
      errors.push('Theme must be either "light" or "dark"');
    }

    // Email notifications validation
    if (preferences.email_notifications !== undefined && typeof preferences.email_notifications !== 'boolean') {
      errors.push('Email notifications must be a boolean');
    }

    // Content language validation
    if (preferences.content_language !== undefined) {
      const languageRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
      if (!languageRegex.test(preferences.content_language)) {
        errors.push('Content language must be a valid language code (e.g., "en" or "en-US")');
      }
    }

    // Summary level validation
    if (preferences.summary_level !== undefined) {
      if (!Number.isInteger(preferences.summary_level) || preferences.summary_level < 1 || preferences.summary_level > 3) {
        errors.push('Summary level must be an integer between 1 and 3');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public static getInstance(container?: ServiceContainer): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      if (!container) {
        throw new Error('UserPreferencesService must be initialized with a container before use');
      }
      UserPreferencesService.instance = new UserPreferencesService(container);
    }
    return UserPreferencesService.instance;
  }
}

export function initializeUserPreferencesService(container: any): void {
  if (typeof container.getPool !== 'function') {
    container = initializeServiceContainer(container);
  }
  UserPreferencesService.initialize(container);
}

export function getUserPreferencesService(container?: any): UserPreferencesService {
  if (!container) {
    if (!UserPreferencesService.instance) {
      throw new Error('UserPreferencesService not initialized');
    }
    return UserPreferencesService.instance;
  }

  if (typeof container.getPool !== 'function') {
    container = initializeServiceContainer(container);
  }
  return UserPreferencesService.getInstance(container);
}

export function resetUserPreferencesService(): void {
  UserPreferencesService.instance = null;
} 