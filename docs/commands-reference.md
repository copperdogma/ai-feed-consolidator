# AI Feed Consolidator Commands Reference

This document serves as the authoritative reference for commands, paths, and operations specific to the AI Feed Consolidator project.

## Project Structure
- `/app` - Application root in production container
- `/data` - Persistent data storage

## Local Development Commands

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
createdb dev-ai-feed-consolidator-db

# Create test database
createdb test-ai-feed-consolidator-db

# Access development database CLI
psql dev-ai-feed-consolidator-db

# Access test database CLI
psql test-ai-feed-consolidator-db

# Common psql commands
\dt                           # List tables
\d table_name                 # Describe table
\l                           # List databases
\du                          # List users
\df                          # List functions
\dv                          # List views
\dn                          # List schemas
\timing                      # Toggle query timing
\x                           # Toggle expanded display
\q                           # Quit psql
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
SELECT pg_size_pretty(pg_database_size('dev-ai-feed-consolidator-db'));

# Kill all connections to development database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'dev-ai-feed-consolidator-db'
  AND pid <> pg_backend_pid();
```

#### Sequelize Commands
```bash
# Generate new migration
npx sequelize-cli migration:generate --name add-fields-to-content

# Run migrations (development)
npx sequelize-cli db:migrate

# Run migrations (test)
npx sequelize-cli db:migrate --env test

# Run migrations (production)
npx sequelize-cli db:migrate --env production

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all

# Show migration status
npx sequelize-cli db:migrate:status
```

#### PostgreSQL Production
```bash
# Connect to production database
flyctl postgres connect -a ai-feed-consolidator-postgres

# Start proxy for GUI tools (keep terminal open)
flyctl proxy 15432:5432 -a ai-feed-consolidator-postgres

# Connect via psql through proxy (new terminal)
psql "postgresql://postgres:PASSWORD@localhost:15432"

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
WHERE pg_stat_activity.datname = 'dev-ai-feed-consolidator-db'
  AND pid <> pg_backend_pid();

-- Drop and recreate
DROP DATABASE IF EXISTS "dev-ai-feed-consolidator-db";
CREATE DATABASE "dev-ai-feed-consolidator-db";
```

## Common Paths

### Configuration Files
- `fly.toml` - Main fly.io configuration
- `infra/supervisord.conf` - Supervisor configuration
- `infra/start.sh` - Container startup script
- `infra/Dockerfile` - Container definition

### Data Directories
- `/app` - Application files
- `/data` - Persistent storage

## Environment Variables
Required environment variables for different environments:

### Development
```bash
NODE_ENV=development
DB_CONNECTION_STRING_DEV=postgresql://postgres@localhost:5432/dev-ai-feed-consolidator-db
DB_USERNAME_DEV=postgres
DB_PASSWORD_DEV=
DB_HOST_NAME_DEV=localhost
DB_PORT_DEV=5432
```

### Testing
```bash
NODE_ENV=test
DB_CONNECTION_STRING_TEST=postgresql://postgres@localhost:5432/test-ai-feed-consolidator-db
DB_USERNAME_TEST=postgres
DB_PASSWORD_TEST=
DB_HOST_NAME_TEST=localhost
DB_PORT_TEST=5432
```

### Production
```bash
NODE_ENV=production
DB_CONNECTION_STRING_PROD=postgres://postgres:password@ai-feed-consolidator-postgres.internal:5432/ai-feed-consolidator
DB_USERNAME_PROD=postgres
DB_PASSWORD_PROD=<secret>
DB_HOST_NAME_PROD=ai-feed-consolidator-postgres.internal
DB_PORT_PROD=5432
PORT=8080
ORIGIN=https://ai-feed-consolidator.chat
```

## Troubleshooting Commands

### Container Debugging
```bash
# SSH into container
flyctl ssh console

# Check logs
flyctl logs

# Check service logs
supervisorctl tail -f node
```

### Database Verification
```bash
# PostgreSQL
flyctl postgres connect -a ai-feed-consolidator-postgres -c "\dt"
```

## Notes
- Always use `--remote-only` for deployments to ensure consistent builds
- Supervisor manages Node.js process
- Volume mounts persist across deployments 