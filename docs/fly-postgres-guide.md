# PostgreSQL Deployment on fly.io

20240116: Created by Cam Marsollier with Claude 3.5 Sonnet
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet for AI Feed Consolidator project

## Overview
This guide outlines the process of setting up and managing our PostgreSQL database on fly.io for the AI Feed Consolidator application. We use PostgreSQL to store content items, topics, summaries, and metadata for our content aggregation system.

## Initial Setup

### 1. Create PostgreSQL Instance
Create a new PostgreSQL cluster in the same region as your app:
```bash
flyctl postgres create \
  --name ai-feed-consolidator-postgres \
  --region sea \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 1
```

### 2. Get Connection String
```bash
flyctl postgres show ai-feed-consolidator-postgres --password
```
Save the connection string, which will look like:
`postgres://postgres:randompassword@ai-feed-consolidator-postgres.internal:5432`

### 3. Attach to Application
```bash
flyctl postgres attach ai-feed-consolidator-postgres --app ai-feed-consolidator
```

### 4. Set Environment Variables
```bash
# Set the production database connection string
flyctl secrets set \
  DB_CONNECTION_STRING_PROD="postgres://postgres:randompassword@ai-feed-consolidator-postgres.internal:5432/ai-feed-consolidator" \
  DB_USERNAME_PROD="postgres" \
  DB_PASSWORD_PROD="randompassword" \
  DB_HOST_NAME_PROD="ai-feed-consolidator-postgres.internal" \
  DB_PORT_PROD="5432"
```

## Database Configuration

### Database Migration Setup
The application uses raw SQL migrations with a custom migration runner for better control and performance:

1. **Migration Files**: Located in `src/server/migrations`
   - Files are named with timestamp prefix: `YYYYMMDDHHMMSS-description.cjs`
   - Each migration exports `up` and `down` functions
   - Migrations use raw SQL for maximum flexibility and performance

2. **Migration Runner**: `scripts/db.cjs`
   - Handles migration execution and rollback
   - Provides validation and safety checks
   - Supports dry-run mode for testing
   - Creates automatic backups before migrations

3. **Best Practices**:
   - Always wrap migrations in transactions
   - Include both `up` and `down` functions
   - Use `CREATE INDEX CONCURRENTLY` for zero-downtime index creation
   - Test migrations in development before production
   - Back up database before running migrations

### Running Migrations

```bash
# Run pending migrations
npm run migrate

# Show migration status
npm run migrate:status

# Create new migration
npm run migrate:create your-migration-name

# Verify database structure
npm run migrate:verify

# Run with options
npm run migrate -- --dry-run    # Show what would be done
npm run migrate -- --verbose    # Show detailed output
npm run migrate -- --force      # Allow potentially dangerous operations
npm run migrate -- --no-backup  # Skip backup creation
```

### Rolling Back Migrations

```bash
# Rollback last batch of migrations
npm run migrate:rollback

# Verify rollback would do
npm run migrate:rollback -- --dry-run

# Force rollback with no backup
npm run migrate:rollback -- --force --no-backup
```

## Testing

### Integration Tests
The application includes database integration tests:

1. **Transaction Management**
   - Each test runs in a transaction
   - Transactions are rolled back after each test
   - Ensures test isolation

2. **Test Coverage**
   - Content and topic creation
   - Summary generation
   - Priority management
   - Data validation
   - Error handling

3. **Test Database**
   - Separate database for testing
   - Cleaned between test runs
   - Mirrors production schema

### Running Tests
```bash
# Run all tests
npm test

# Run database tests only
npm test tests/integration/database.test.js

# Run with coverage
npm test -- --coverage
```

### 5. Run Initial Migrations
```bash
# Connect to the app instance
flyctl ssh console

# Run migrations
cd /app
NODE_ENV=production npm run migrate -- --verbose
```

### 6. Verify Database
```bash
# Connect to Postgres console
flyctl postgres connect -a ai-feed-consolidator-postgres

# Check tables
\dt

# Verify specific tables exist
SELECT COUNT(*) FROM "content";
SELECT COUNT(*) FROM "topic";
SELECT COUNT(*) FROM "summary";
```

## Database Management

### Backup Database
Before major changes:
```bash
# Create a full backup
flyctl postgres backup ai-feed-consolidator-postgres

# List available backups
flyctl postgres backups list ai-feed-consolidator-postgres
```

### Run Migrations
```bash
# Connect to app instance
flyctl ssh console

# Run migrations
cd /app
NODE_ENV=production npm run migrate -- --verbose
```

### Verify Changes
```bash
# Connect to Postgres console
flyctl postgres connect -a ai-feed-consolidator-postgres

# Check table structure
\d+ table_name

# Verify data
SELECT COUNT(*) FROM table_name;
```

## Monitoring

### Check Database Status
```bash
# View cluster status
flyctl postgres status -a ai-feed-consolidator-postgres

# Check connection count
flyctl postgres connect -a ai-feed-consolidator-postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### View Database Metrics
```bash
# View resource usage
flyctl postgres metrics -a ai-feed-consolidator-postgres

# Check database size
flyctl postgres connect -a ai-feed-consolidator-postgres -c "SELECT pg_size_pretty(pg_database_size('ai-feed-consolidator'));"
```

### View Database Logs
```bash
# View recent logs
flyctl postgres logs -a ai-feed-consolidator-postgres

# Follow logs in real-time
flyctl postgres logs -a ai-feed-consolidator-postgres --follow
```

## External Access

### GUI Tool Connection
1. Start proxy in terminal (keep running):
```bash
flyctl proxy 15432:5432 -a prod-ai-feed-consolidator-db
```

2. Configure TablePlus:
- Host: localhost
- Port: 15432
- User: postgres
- Database: postgres (or specific database)
- Password: (from DB_PASSWORD_PROD)

### Direct CLI Access
```bash
# Connect to database console
flyctl postgres connect -a ai-feed-consolidator-postgres

# Run specific query
flyctl postgres connect -a ai-feed-consolidator-postgres -c "SELECT version();"
```

## Troubleshooting

### Common Issues
1. **Connection Failures**
   - Verify connection string format and credentials
   - Check if database is running: `flyctl postgres status -a ai-feed-consolidator-postgres`
   - Ensure app has correct permissions: `\du` in psql console
   - Check connection limits: `SELECT * FROM pg_stat_activity;`

2. **Migration Failures**
   - Check migration logs in app console
   - Verify database schema: `\d+` in psql console
   - Review migration files for errors
   - Consider rolling back: `npm run migrate:rollback`

### Recovery Steps
1. **Database Restore**
```bash
# List available backups
flyctl postgres backups list ai-feed-consolidator-postgres

# Restore from backup
flyctl postgres restore ai-feed-consolidator-postgres --backup-id <backup-id>
```

2. **Migration Rollback**
```bash
# Undo last migration
npm run migrate:rollback

# Undo all migrations
npm run migrate:reset -- --force

# Rerun migrations
npm run migrate -- --verbose
```

3. **Connection Reset**
```bash
# Kill all connections
flyctl postgres connect -a ai-feed-consolidator-postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ai-feed-consolidator';"
``` 