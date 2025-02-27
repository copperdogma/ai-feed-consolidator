#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Constants
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'server', 'migrations');
const SEEDERS_DIR = path.join(__dirname, '..', 'src', 'server', 'seeders');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const STATEMENT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

class Logger {
  static levels = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  static level = Logger.levels.INFO;

  static error(...args) {
    if (Logger.level >= Logger.levels.ERROR) console.error('\x1b[31m❌', ...args, '\x1b[0m');
  }

  static warn(...args) {
    if (Logger.level >= Logger.levels.WARN) console.warn('\x1b[33m⚠️ ', ...args, '\x1b[0m');
  }

  static info(...args) {
    if (Logger.level >= Logger.levels.INFO) console.log('\x1b[36mℹ️ ', ...args, '\x1b[0m');
  }

  static success(...args) {
    if (Logger.level >= Logger.levels.INFO) console.log('\x1b[32m✓', ...args, '\x1b[0m');
  }

  static debug(...args) {
    if (Logger.level >= Logger.levels.DEBUG) console.log('\x1b[90m🔍', ...args, '\x1b[0m');
  }
}

class DatabaseManager {
  constructor(options = {}) {
    this.options = {
      env: process.env.NODE_ENV || 'development',
      dryRun: false,
      verbose: false,
      force: false,
      backup: true,
      parallel: false,
      ...options
    };

    // Set logger level based on verbose option
    Logger.level = this.options.verbose ? Logger.levels.DEBUG : Logger.levels.INFO;

    // Initialize pool with environment-specific connection
    this.pool = new Pool({
      connectionString: this.getDatabaseUrl(),
      statement_timeout: STATEMENT_TIMEOUT,
    });

    // Ensure backup directory exists
    if (this.options.backup) {
      fs.mkdir(BACKUP_DIR, { recursive: true }).catch(() => {});
    }
  }

  getDatabaseUrl() {
    const envUrls = {
      development: 'postgres://postgres:postgres@localhost:5433/ai-feed-dev',
      test: 'postgres://postgres:postgres@localhost:5433/ai-feed-test',
      production: process.env.DATABASE_URL
    };

    const url = process.env.DATABASE_URL || envUrls[this.options.env];
    if (!url) {
      throw new Error(`No database URL configured for environment: ${this.options.env}`);
    }
    return url;
  }

  async createBackup() {
    if (!this.options.backup) return;

    const dbName = new URL(this.getDatabaseUrl()).pathname.slice(1);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `${dbName}_${timestamp}.sql`);

    Logger.info(`Creating backup: ${backupFile}`);
    
    if (!this.options.dryRun) {
      try {
        execSync(`PGPASSWORD=postgres pg_dump -h localhost -p 5433 -U postgres -d ${dbName} -f ${backupFile}`);
        Logger.success('Backup created successfully');
      } catch (error) {
        Logger.warn('Failed to create backup:', error.message);
        if (!this.options.force) {
          throw new Error('Backup failed and --force not specified');
        }
      }
    }
  }

  async initialize() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          batch INTEGER NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN NOT NULL DEFAULT true,
          error_message TEXT,
          duration_ms INTEGER,
          checksum TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
        CREATE INDEX IF NOT EXISTS idx_migrations_batch ON migrations(batch);
        CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at);
      `);
    } finally {
      client.release();
    }
  }

  async getExecutedMigrations() {
    const { rows } = await this.pool.query(
      'SELECT name, batch, success, checksum FROM migrations ORDER BY executed_at ASC'
    );
    return new Map(rows.filter(r => r.success).map(r => [r.name, r]));
  }

  async getCurrentBatch() {
    const { rows } = await this.pool.query(
      'SELECT COALESCE(MAX(batch), 0) as batch FROM migrations'
    );
    return rows[0].batch;
  }

  async validateMigration(client, file, migration) {
    Logger.info(`Validating migration: ${file}`);
    
    const issues = [];

    try {
      if (file.endsWith('.sql')) {
        const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
        
        // Check for dangerous operations
        if (sql.toLowerCase().includes('drop database')) {
          issues.push('Migration contains DROP DATABASE command');
        }
        if (sql.toLowerCase().includes('truncate') && !sql.toLowerCase().includes('cascade')) {
          issues.push('TRUNCATE should include CASCADE to handle foreign keys');
        }
        
        // Check for proper transaction handling
        if (!sql.toLowerCase().includes('begin') || !sql.toLowerCase().includes('commit')) {
          issues.push('SQL migration should be wrapped in a transaction');
        }
        
        // Check for index creation method
        if (sql.toLowerCase().includes('create index') && !sql.toLowerCase().includes('concurrently')) {
          issues.push('Consider using CREATE INDEX CONCURRENTLY for zero-downtime index creation');
        }
      } else if (file.endsWith('.cjs')) {
        // Validate JS migration structure
        if (!migration.up || typeof migration.up !== 'function') {
          issues.push('Migration must export an "up" function');
        }
        if (!migration.down || typeof migration.down !== 'function') {
          issues.push('Migration must export a "down" function for rollbacks');
        }
        
        // Get table info before migration
        const { rows: tablesBefore } = await client.query(`
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
        `);
        
        // Run migration in a transaction
        await client.query('BEGIN');
        try {
          // Run the migration in dry-run mode
          await migration.up(client);

          // Get table info after migration
          const { rows: tablesAfter } = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
          `);

          // Compare table structures
          const addedColumns = tablesAfter.filter(col => 
            !tablesBefore.some(t => 
              t.table_name === col.table_name && 
              t.column_name === col.column_name
            )
          );

          const removedColumns = tablesBefore.filter(col => 
            !tablesAfter.some(t => 
              t.table_name === col.table_name && 
              t.column_name === col.column_name
            )
          );

          if (removedColumns.length > 0) {
            issues.push(`Migration removes columns: ${removedColumns.map(c => `${c.table_name}.${c.column_name}`).join(', ')}`);
          }

          // Rollback changes
          await client.query('ROLLBACK');
        } catch (error) {
          await client.query('ROLLBACK');
          issues.push(`Migration validation failed: ${error.message}`);
        }
      }
    } catch (error) {
      issues.push(`Failed to validate migration: ${error.message}`);
    }

    return issues;
  }

  async runMigration(client, file, migration, batch) {
    const start = Date.now();
    let success = false;
    let errorMessage = null;

    try {
      Logger.info(`Running migration: ${file}`);
      
      await client.query('BEGIN');
      
      if (file.endsWith('.sql')) {
        const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
        await client.query(sql);
      } else if (file.endsWith('.cjs')) {
        await migration.up(client);
      }
      
      // Record successful migration
      await client.query(
        `INSERT INTO migrations (name, batch, success, duration_ms)
         VALUES ($1, $2, true, $3)`,
        [file, batch, Date.now() - start]
      );
      
      await client.query('COMMIT');
      success = true;
      Logger.success(`Migration completed: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      errorMessage = error.message;
      Logger.error(`Migration failed: ${file}`, error);
      throw error;
    } finally {
      if (!success) {
        // Record failed migration
        await client.query(
          `INSERT INTO migrations (name, batch, success, error_message, duration_ms)
           VALUES ($1, $2, false, $3, $4)`,
          [file, batch, errorMessage, Date.now() - start]
        );
      }
    }
  }

  async migrate() {
    await this.initialize();
    
    if (this.options.backup) {
      await this.createBackup();
    }

    const client = await this.pool.connect();
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const currentBatch = await this.getCurrentBatch();
      
      // Get all migration files
      const files = (await fs.readdir(MIGRATIONS_DIR))
        .filter(f => f.endsWith('.sql') || f.endsWith('.cjs'))
        .sort();
      
      // Find pending migrations
      const pendingMigrations = files.filter(f => !executedMigrations.has(f));
      
      if (pendingMigrations.length === 0) {
        Logger.info('No pending migrations');
        return;
      }
      
      Logger.info(`Found ${pendingMigrations.length} pending migrations`);
      
      // Run each pending migration
      for (const file of pendingMigrations) {
        const migration = file.endsWith('.cjs') ? require(path.join(MIGRATIONS_DIR, file)) : null;
        
        // Validate migration
        const issues = await this.validateMigration(client, file, migration);
        if (issues.length > 0) {
          Logger.warn(`Migration validation issues for ${file}:`, issues);
          if (!this.options.force) {
            throw new Error(`Migration validation failed and --force not specified`);
          }
        }
        
        // Run migration
        if (!this.options.dryRun) {
          await this.runMigration(client, file, migration, currentBatch + 1);
        }
      }
      
      Logger.success('All migrations completed successfully');
    } finally {
      client.release();
    }
  }

  async rollback() {
    await this.initialize();
    
    if (this.options.backup) {
      await this.createBackup();
    }

    const client = await this.pool.connect();
    try {
      // Get the last batch number
      const { rows } = await client.query(
        'SELECT batch FROM migrations WHERE success = true ORDER BY batch DESC LIMIT 1'
      );
      
      if (rows.length === 0) {
        Logger.info('No migrations to rollback');
        return;
      }
      
      const lastBatch = rows[0].batch;
      
      // Get migrations from the last batch
      const { rows: migrations } = await client.query(
        'SELECT name FROM migrations WHERE batch = $1 AND success = true ORDER BY id DESC',
        [lastBatch]
      );
      
      Logger.info(`Rolling back batch ${lastBatch} (${migrations.length} migrations)`);
      
      // Roll back each migration in reverse order
      for (const { name } of migrations) {
        if (name.endsWith('.cjs')) {
          const migration = require(path.join(MIGRATIONS_DIR, name));
          
          try {
            await client.query('BEGIN');
            await migration.down(client);
            await client.query('DELETE FROM migrations WHERE name = $1', [name]);
            await client.query('COMMIT');
            Logger.success(`Rolled back: ${name}`);
          } catch (error) {
            await client.query('ROLLBACK');
            Logger.error(`Failed to roll back ${name}:`, error);
            throw error;
          }
        } else {
          Logger.warn(`Cannot roll back SQL migration: ${name}`);
        }
      }
      
      Logger.success('Rollback completed successfully');
    } finally {
      client.release();
    }
  }

  async reset() {
    await this.initialize();
    
    if (!this.options.force && this.options.env === 'production') {
      throw new Error('Cannot reset production database without --force flag');
    }

    const client = await this.pool.connect();
    try {
      // Drop all tables in reverse order
      const { rows } = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      if (this.options.dryRun) {
        Logger.info('[DRY RUN] Would drop tables:', rows.map(r => r.tablename).join(', '));
        return;
      }

      await client.query('BEGIN');
      
      for (const { tablename } of rows) {
        await client.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      }
      
      await client.query('COMMIT');
      Logger.success('Database reset successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async status() {
    await this.initialize();
    
    const client = await this.pool.connect();
    try {
      // Get migration history
      const { rows } = await client.query(`
        SELECT 
          name,
          batch,
          success,
          executed_at,
          error_message,
          duration_ms
        FROM migrations 
        ORDER BY executed_at DESC
        LIMIT 10
      `);

      Logger.info('\nRecent migration history:');
      rows.forEach(row => {
        const status = row.success ? '✓' : '❌';
        const duration = row.duration_ms ? ` (${row.duration_ms}ms)` : '';
        const batchInfo = `[Batch ${row.batch}]`;
        Logger.info(
          `${status} ${row.name} ${batchInfo} - ${new Date(row.executed_at).toISOString()}${duration}`
        );
        if (!row.success && row.error_message) {
          Logger.error(`  Error: ${row.error_message}`);
        }
      });

      // Get table information
      Logger.info('\nDatabase structure:');
      const { rows: tables } = await client.query(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
          pg_size_pretty(pg_total_relation_size(table_name::text)) as size
        FROM (
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ) t
        ORDER BY table_name
      `);

      tables.forEach(table => {
        Logger.info(`  - ${table.table_name} (${table.column_count} columns, ${table.size})`);
      });
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

async function main() {
  const command = process.argv[2] || 'migrate';
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose'),
    force: process.argv.includes('--force'),
    backup: !process.argv.includes('--no-backup'),
    parallel: process.argv.includes('--parallel')
  };

  const db = new DatabaseManager(options);

  try {
    switch (command) {
      case 'migrate':
        await db.migrate();
        break;
      case 'rollback':
        await db.rollback();
        break;
      case 'reset':
        await db.reset();
        break;
      case 'status':
        await db.status();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    Logger.error('Command failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseManager; 