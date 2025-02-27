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

### Git
Use the MCP git server.

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
# Configure a PostgreSQL instance on port 5433
initdb -D /usr/local/var/postgresql-5433

# Edit postgresql.conf to change the port
echo "port = 5433" >> /usr/local/var/postgresql-5433/postgresql.conf

# Start the PostgreSQL instance
pg_ctl -D /usr/local/var/postgresql-5433 -l logfile start

# Create development and test databases
createdb -p 5433 ai-feed-dev
createdb -p 5433 ai-feed-test

# Access development database CLI
psql -p 5433 ai-feed-dev

# Access test database CLI
psql -p 5433 ai-feed-test

# Common database tasks
psql -p 5433 -d ai-feed-dev -c "\dt" | cat     # List all tables
psql -p 5433 -d ai-feed-dev -c "\d users" | cat # Describe users table

# If you accidentally use the wrong port
# This is a common error! If your app fails to connect, check that:
# 1. The PostgreSQL instance on port 5433 is running
# 2. Your DATABASE_URL in .env is using port 5433
# 3. You've created both ai-feed-dev and ai-feed-test databases
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

#### Migration Commands
```bash
# Run migrations for development
NODE_ENV=development node src/server/services/db.js

# Run migrations for test
NODE_ENV=test node src/server/services/db.js

# Run migrations for production
NODE_ENV=production node src/server/services/db.js

# Check migration status
psql -d ai-feed-dev -c "SELECT * FROM pg_tables WHERE schemaname = 'public'" | cat
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

## Commands Reference

## Database Management

The project uses a unified database management script (`scripts/db.cjs`) that provides the following commands:

### Basic Commands

- `npm run migrate`: Run pending migrations
- `npm run migrate:status`: Show migration status and history
- `npm run migrate:create <name>`: Create a new migration file
- `npm run migrate:verify`: Verify database structure
- `npm run migrate:reset`: Reset database (drop all tables)
- `npm run db <command>`: Run any database command directly

### Test Database

- `npm run test:db:setup`: Reset and migrate test database

### Command Options

All database commands support the following options:

- `--dry-run`: Show what would be done without making changes
- `--verbose`: Show detailed debug information
- `--force`: Allow potentially dangerous operations
- `--no-backup`: Skip database backup before operations
- `--parallel`: Enable parallel operations where possible

Example:
```bash
# Run migrations with verbose output
npm run migrate -- --verbose

# Reset database without backup
npm run migrate:reset -- --force --no-backup
```

### Environment Variables

- `NODE_ENV`: Environment to use (development/test/production)
- `DATABASE_URL`: Database connection URL (optional, defaults based on environment)

### Database URLs

- Development: `postgres://postgres:postgres@localhost:5433/ai-feed-dev`
- Test: `postgres://postgres:postgres@localhost:5433/ai-feed-test`
- Production: Must be set via `DATABASE_URL` environment variable

## Development Commands

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run type-check`: Run TypeScript type checking

## Testing Commands

- `npm test`: Run all tests
- `npm run test:server`: Run server tests only

## Other Commands

- `npm run lint`: Run ESLint
- `npm run format`: Run Prettier
- `npm run clean`: Clean build artifacts

### Troubleshooting Database Connection Issues

If you see errors like "database system is starting up" or "connection refused", try these steps:

```bash
# Check if PostgreSQL is running on port 5433
lsof -i :5433

# If not running, start it
pg_ctl -D /usr/local/var/postgresql-5433 -l logfile start

# Verify databases exist
psql -p 5433 -l | grep ai-feed

# Check connection string format in .env file
# Ensure it uses port 5433: postgres://postgres:postgres@localhost:5433/ai-feed-dev

# Test connection directly
psql postgres://postgres:postgres@localhost:5433/ai-feed-dev -c "SELECT 1"
```