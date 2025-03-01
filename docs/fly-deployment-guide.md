# Deploying AI Feed Consolidator to fly.io

20240116: Created by Cam Marsollier with Claude Sonnet 3.5
20240120: Updated by Cam Marsollier with Claude Sonnet 3.5 for AI Feed Consolidator project

## Overview
This guide outlines the process of deploying our AI Feed Consolidator Docker container to fly.io. We're using fly.io because it provides a simple deployment process with automatic SSL certificates and global distribution capabilities, making our application accessible worldwide with low latency.

## How fly.io Deployments Work
When you run `flyctl deploy`, fly.io handles the deployment process in several steps:

1. **Build Context Creation**
   - fly.io examines your local directory
   - Uses our custom multi-stage Dockerfile
   - Respects `.dockerignore` for excluding files
   - Optimizes build context size

2. **Remote Building**
   - Your build context is sent to fly.io's build service
   - Builds happen remotely on fly.io's infrastructure
   - Uses Docker layer caching for faster builds
   - Multi-stage build reduces final image size:
     1. Base stage: Sets up Node.js environment
     2. Build stage: Compiles React frontend and Node.js backend
     3. Production stage: Creates minimal runtime image

3. **Image Creation**
   - Creates a Docker image from the build
   - Stores it in fly.io's registry
   - Each deployment creates a new unique image
   - Cached layers speed up future builds

4. **Deployment**
   - Deploys new image using rolling updates
   - Verifies health checks
   - Routes traffic to new instances
   - Gracefully shuts down old instances
   - Default timeout: 10 minutes

Note: Our deployment uses a custom `Dockerfile` to build and serve both the React frontend and Node.js API from a single container.

## Container Resource Limits
- Memory: 512MB shared
- CPU: 1 shared CPU
- Disk: System disk (ephemeral)
- Scale to zero enabled
- Auto-start on traffic

## Prerequisites
- macOS with Docker Desktop installed and running
- AI Feed Consolidator Git repository cloned locally
- Docker Compose files configured (docker-compose.yml and docker-compose.override.yml)
- [fly.io account](https://fly.io/app/sign-up)

## Deployment Order
Our application requires PostgreSQL for data persistence. The deployment order is:

1. **PostgreSQL Deployment** (see `fly-postgres-guide.md`)
   - Must be deployed first as it handles all persistent data
   - Required for the main application to start properly
   - Needs time for initial setup and verification

2. **Application Deployment** (steps below)
   - Deploy Docker container with complete configuration
   - Includes both frontend and backend
   - Container will start successfully because PostgreSQL is already running
   - Single deployment step avoids partial failures
   - Cleaner rollback path if needed

This order is specifically designed to:
- Ensure database exists before it's needed
- Minimize risk to existing production setup
- Provide clean rollback points
- Avoid container startup failures

## Initial Setup and First Deployment

### 1. Install fly.io CLI
Install the fly.io command line tool using Homebrew:
```bash
brew install flyctl
```

### 2. Authenticate with fly.io
```bash
flyctl auth login
```

### 3. Deploy Database
Before proceeding with the main application deployment:

Follow `fly-postgres-guide.md` to:
- Create and configure PostgreSQL instance
- Run initial migrations
- Verify database setup
- Save connection details for next steps

### 4. Initialize AI Feed Consolidator Deployment
In the project root directory:
```bash
flyctl launch
```

When prompted:
- Choose app name "ai-feed-consolidator"
- Select "Seattle (sea)" as the primary region
- Skip PostgreSQL setup (we've already configured it)

### 5. Configure Deployment
Update the generated `fly.toml` file with our specific configurations:

```toml
app = 'ai-feed-consolidator'
primary_region = 'sea'

[build]
  [build.args]
    NODE_VERSION = "18"

[env]
  PORT = '8080'
  ORIGIN = 'https://ai-feed-consolidator.fly.dev'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

### 6. Set Required Environment Variables
```bash
# First, set core environment variables
flyctl secrets set \
  NODE_ENV="production" \
  SESSION_SECRET="your-session-secret" \
  OPENAI_API_KEY="your-openai-api-key"

# Then set database-specific variables (after verifying connections)
flyctl secrets set \
  DB_CONNECTION_STRING_PROD="postgres://postgres:randompassword@ai-feed-consolidator-postgres.internal:5432/ai-feed-consolidator" \
  DB_USERNAME_PROD="postgres" \
  DB_PASSWORD_PROD="randompassword" \
  DB_HOST_NAME_PROD="ai-feed-consolidator-postgres.internal" \
  DB_PORT_PROD="5432"
```

### 7. Verify Migration Scripts
Before first deployment, verify all migration scripts:
```bash
# Check all migration files
ls -la migrations/

# Review migration contents
cat migrations/*.js

# Ensure migration tools are installed
npm list pg-promise
```

### 8. First Deployment
```bash
flyctl deploy
```

### 9. Verify Complete Deployment
After deployment, verify all components:

1. Check PostgreSQL connection:
```bash
# Connect to Postgres console
flyctl postgres connect -a ai-feed-consolidator-postgres

# Verify database and tables
\dt
SELECT COUNT(*) FROM "content";
SELECT COUNT(*) FROM "topic";
```

2. Check application status:
```bash
# Check app status and allocation
flyctl status

# View application logs for any startup errors
flyctl logs --app ai-feed-consolidator

# Check machine status
flyctl machine list

# Verify app is responding
curl -I https://ai-feed-consolidator.fly.dev
```

## Updating Existing Deployment

### 1. Review Changes
- Check all changed files
- Review migration scripts if any
- Test changes locally with Docker

### 2. Deploy Updates
```bash
# Deploy with remote builder
flyctl deploy --remote-only

# If deployment takes longer than usual
flyctl deploy --remote-only --wait-timeout 15m

# For debugging deployment issues
flyctl deploy --remote-only --verbose
```

### 3. Verify Update
```bash
# Check logs for errors
flyctl logs

# Verify database migrations
flyctl postgres connect -a ai-feed-consolidator-postgres -c "\dx"

# Test critical functionality
curl -I https://ai-feed-consolidator.fly.dev/api/health
```

## Troubleshooting

### Common Issues
1. **Database Connection Failures**
   - Verify PostgreSQL is running: `flyctl status -a ai-feed-consolidator-postgres`
   - Check connection string in environment variables
   - Verify network connectivity: `flyctl postgres connect`

2. **Build Failures**
   - Check build logs: `flyctl deploy --remote-only --verbose`
   - Verify Node.js version in Dockerfile
   - Check for missing dependencies

3. **Runtime Errors**
   - Check application logs: `flyctl logs`
   - Verify environment variables: `flyctl secrets list`
   - Check resource usage: `flyctl status`

### Recovery Steps
1. **Roll Back Deployment**
```bash
# List available versions
flyctl releases list

# Roll back to previous version
flyctl deploy --image v123
```

2. **Reset Database (if needed)**
```bash
# Connect to database
flyctl postgres connect -a ai-feed-consolidator-postgres

# Run undo migrations
npm run migrate:reset -- --force
npm run migrate -- --verbose
```

3. **Restart Application**
```bash
flyctl apps restart ai-feed-consolidator
```

## Maintenance
- Deploy updates using `flyctl deploy`
- Monitor application costs through fly.io dashboard
- Regularly check logs for any authentication or database connection issues
- Keep Node.js version updated in build args
- Regular database backups (see respective guides)
- Monitor database health and performance

## Useful Resources
- [fly.io Pricing](https://fly.io/docs/about/pricing/)
- [fly.io CLI Reference](https://fly.io/docs/flyctl/) 