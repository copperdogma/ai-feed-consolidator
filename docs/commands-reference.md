# AI Feed Consolidator Commands Reference

20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to add code quality commands
20240320: Updated by Cam Marsollier with Claude 3.5 Sonnet to add test commands
20240326: Updated by Cam Marsollier with Claude 3.5 Sonnet to add migration best practices

This document serves as the authoritative reference for commands, paths, and operations specific to the AI Feed Consolidator project.

## Project Structure
- `/app` - Application root in production container
- `/data` - Persistent data storage
- `/src` - Source code directory
- `/docs` - Project documentation

## Local Development Commands

### NPM Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format code with Prettier
npm run type-check  # TypeScript type checking

# Testing
npm run test:ci     # Run tests once and exit (good for CI/CD)
npm run test:coverage # Run tests with coverage report

# Logging
npm run dev | pino-pretty                  # Pretty print logs during development
tail -f logs/app.log | pino-pretty         # View and pretty print log file
grep -i error logs/app.log | pino-pretty   # Filter and pretty print errors
pino-pretty -c -t 'SYS:standard' < logs/app.log  # Custom time format for logs

# Preview production build
npm run preview
```

### Code Quality Configuration Files
- `.prettierrc` - Prettier configuration
  ```json
  {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 2,
    "useTabs": false,
    "bracketSpacing": true,
    "arrowParens": "avoid"
  }
  ```
- `eslint.config.js` - ESLint configuration (flat config format)
- `tsconfig.json` - TypeScript configuration

### Docker Development
```bash
# Build container with development settings
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild and restart single service
docker compose up -d --build app

# Clean up unused resources
docker system prune -f

# Remove all containers and volumes (CAUTION)
docker compose down -v
```

### Container Management
```bash
# Access container shell
docker exec -it ai-feed-consolidator-app bash

# View logs
docker logs -f ai-feed-consolidator-app

# Check container status
docker ps -a

# View resource usage
docker stats ai-feed-consolidator-app

# Restart services
docker exec ai-feed-consolidator-app supervisorctl restart node
```

### Log Management
```bash
# View real-time logs with pretty printing
tail -f logs/app.log | pino-pretty

# Search logs for errors
grep -i "error" logs/app.log | pino-pretty

# Search logs for specific user activity
grep -i "userId" logs/app.log | pino-pretty

# Filter logs by date (example for Jan 20, 2025)
grep "2025-01-20" logs/app.log | pino-pretty

# Count error occurrences
grep -i "error" logs/app.log | wc -l

# Rotate logs (if needed)
mv logs/app.log logs/app.$(date +%Y%m%d).log
touch logs/app.log

# Clean old logs (older than 7 days)
find logs/ -name "app.*.log" -mtime +7 -delete
```

### Multi-stage Builds
```bash
# Build with specific target
docker build --target build -t ai-feed-consolidator:build .

# Build production image
docker build -t ai-feed-consolidator:prod -f infra/Dockerfile .

# Build with build args
docker build --build-arg NODE_ENV=development -t ai-feed-consolidator:dev .
```

## Deployment Commands

### Basic Deployment
```bash
# Deploy with remote builder (preferred)
flyctl deploy --remote-only

# Deploy with extended timeout
flyctl deploy --remote-only --wait-timeout 10m

# Deploy with debug output
flyctl deploy --remote-only --verbose
```

### Status & Monitoring
```bash
# Check application status
flyctl status

# View logs
flyctl logs

# Monitor specific machine
flyctl machine status <machine-id>
```

### Database Operations

#### PostgreSQL Local Development
```bash
# Start PostgreSQL service
brew services start postgresql@14

# Stop PostgreSQL service
brew services stop postgresql@14

# Initialize database directory
initdb -D /usr/local/var/postgresql@14

# Create development database
createdb ai-feed-dev

# Create test database
createdb ai-feed-test

# Access development database CLI
psql ai-feed-dev

# Access test database CLI
psql ai-feed-test

# Common psql commands (pipe through cat to avoid interactive pager)
\dt | cat                           # List tables
\d table_name | cat                 # Describe table
\l | cat                           # List databases
\du | cat                          # List users
\df | cat                          # List functions
\dv | cat                          # List views
\dn | cat                          # List schemas
\timing                      # Toggle query timing
\x                           # Toggle expanded display
\q                           # Quit psql

# Examples with cat to avoid pager
psql -d ai-feed-dev -c "\dt" | cat     # List all tables
psql -d ai-feed-dev -c "\d users" | cat # Describe users table
psql -d ai-feed-dev -c "SELECT * FROM users" | cat # Query results
```

#### Database Maintenance
```bash
# Analyze tables for query optimization
ANALYZE table_name;

# Vacuum tables to reclaim space
VACUUM table_name;

# Full vacuum with table rewrite
VACUUM FULL table_name;

# Reindex tables
REINDEX TABLE table_name;

# View table sizes
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

# View database size
SELECT pg_size_pretty(pg_database_size('ai-feed-dev'));

# Kill all connections to development database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'ai-feed-dev'
  AND pid <> pg_backend_pid();
```

#### Sequelize Commands
```bash
# Generate new migration
npx sequelize-cli migration:generate --name migration-name

# Set database URL for development (run this first, or add to your .bashrc/.zshrc)
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/ai-feed-dev"

# Run migrations
npx sequelize-cli db:migrate                    # Development (uses DATABASE_URL)
npx sequelize-cli db:migrate --env test         # Test environment
npx sequelize-cli db:migrate --env production   # Production environment

# Check migration status
npx sequelize-cli db:migrate:status

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all
```

Note: The database connection URLs should be configured in your project's config files or environment variables rather than passed directly in commands. For local development, you can set the DATABASE_URL environment variable as shown above.

#### Migration Best Practices
1. **Naming Convention**
   - Use timestamp prefix: YYYYMMDDHHMMSS
   - Descriptive names: `create-table`, `add-column`, `modify-column`
   - Example: `20240127000000-create-auth-tables.cjs`

2. **Structure**
   - Always include both `up` and `down` methods
   - Use explicit column types from Sequelize
   - Add relevant indexes in same migration
   - Include table/column comments

3. **Safety**
   - Make migrations reversible
   - Test both up and down migrations
   - Run migrations on test DB first
   - Back up production DB before migrating

4. **Documentation**
   - Comment complex migrations
   - Update schema documentation
   - Record migration in changelog
   - Document any manual steps

### Running SQL Migrations
```bash
# Run all SQL migrations in order
for f in migrations/0*.sql; do echo "Running $f..."; psql database_name -f "$f"; done

# Run specific SQL migration
psql database_name -f migrations/specific_migration.sql

# Run SQL migrations with error checking
for f in migrations/0*.sql; do
  echo "Running $f..."
  if ! psql database_name -f "$f"; then
    echo "Error running $f"
    exit 1
  fi
done
```

### Migration Workflow
1. Create development database if it doesn't exist:
   ```bash
   createdb ai-feed-dev
   ```

2. Create test database if it doesn't exist:
   ```bash
   createdb ai-feed-test
   ```

3. Run base SQL migrations first (if any):
   ```bash
   for f in migrations/0*.sql; do psql database_name -f "$f"; done
   ```

4. Run Sequelize migrations:
   ```bash
   # Development
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai-feed-dev npx sequelize-cli db:migrate

   # Test
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai-feed-test npx sequelize-cli db:migrate --env test
   ```

5. Verify migrations:
   ```bash
   # Check migration status
   npx sequelize-cli db:migrate:status

   # Verify table structure
   psql database_name -c "\d table_name"
   ```

#### PostgreSQL Production
```bash
# Connect to production database
flyctl postgres connect -a ai-feed-consolidator-postgres

# Start proxy for GUI tools (keep terminal open)
flyctl proxy 15432:5432 -a ai-feed-consolidator-postgres

# Connect via psql through proxy (new terminal)
psql "postgresql://<username>:<password>@<host>:<port>"

# Common psql commands
\dt                           # List tables
\d table_name                # Describe table
\l                           # List databases
\du                          # List users
\q                           # Quit psql
\?                           # Help
```

#### Database Reset (Development Only)
```sql
-- Kill all connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'ai-feed-dev'
  AND pid <> pg_backend_pid();

-- Drop and recreate
DROP DATABASE IF EXISTS "ai-feed-dev";
CREATE DATABASE "ai-feed-dev";
```

## Common Paths

### Configuration Files
- `fly.toml` - Main fly.io configuration
- `infra/supervisord.conf` - Supervisor configuration
- `infra/start.sh`

## Environment Variables
Required environment variables for different environments:

### Development
```bash
NODE_ENV=development
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<database>
```

### Testing
```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@db:5433/aifeed_test
```

### Production
```bash
NODE_ENV=production
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<database>
PORT=8080
ORIGIN=https://ai-feed-consolidator.chat
```

## Notes
- Always use `--remote-only` for deployments to ensure consistent builds
- Use npm scripts for code quality tasks
- ESLint is configured with the new flat config format (ESLint 9+)
- Prettier is integrated with ESLint for consistent formatting