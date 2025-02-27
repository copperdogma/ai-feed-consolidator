#!/bin/bash

# Exit on error
set -e

# Define colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print with colors
function print_blue() { echo -e "${BLUE}$1${NC}"; }
function print_green() { echo -e "${GREEN}$1${NC}"; }
function print_red() { echo -e "${RED}$1${NC}"; }
function print_yellow() { echo -e "${YELLOW}$1${NC}"; }

# Create temporary files for test output
server_output=$(mktemp)
client_output=$(mktemp)

# Cleanup function
cleanup() {
  print_blue "Cleaning up..."
  rm -f "$server_output" "$client_output"
  exit "${1:-0}"
}

# Set up trap for cleanup
trap 'cleanup $?' EXIT
trap 'cleanup 1' INT TERM

# Function to run a command with a timeout
run_with_timeout() {
  local timeout=$1
  local command=$2
  local msg=$3
  
  print_blue "⏱️ Running with timeout of ${timeout}s: $msg"
  
  # Use timeout command to enforce a time limit
  timeout ${timeout}s bash -c "$command" || {
    local exit_code=$?
    if [ $exit_code -eq 124 ]; then
      print_red "❌ Command timed out after ${timeout} seconds!"
      return 1
    else
      print_red "❌ Command failed with exit code $exit_code"
      return $exit_code
    fi
  }
}

# Export environment variables
export NODE_ENV=test
export NODE_OPTIONS='--max-old-space-size=8192'
export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai-feed-test
export PGPASSWORD=postgres
export OPENAI_API_KEY=test-key

# Parse command line arguments
skip_db=false
test_pattern=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-db)
      skip_db=true
      shift
      ;;
    *)
      if [ -z "$test_pattern" ]; then
        test_pattern="$1"
      else
        test_pattern="$test_pattern $1"
      fi
      shift
      ;;
  esac
done

# Function to check PostgreSQL server and client compatibility
check_pg_versions() {
  print_blue "Checking PostgreSQL server and client versions..."
  
  # Get server version
  server_version=$(PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -t -c "SELECT version();" | grep -o "PostgreSQL [0-9]\+\.[0-9]\+" | cut -d " " -f 2)
  
  # Get pg_dump version
  pg_dump_version=$(pg_dump --version | grep -o "[0-9]\+\.[0-9]\+" | head -n 1)
  
  print_blue "PostgreSQL Server: $server_version, pg_dump: $pg_dump_version"
  
  # Check major versions
  server_major=$(echo $server_version | cut -d "." -f 1)
  dump_major=$(echo $pg_dump_version | cut -d "." -f 1)
  
  if [ "$server_major" != "$dump_major" ]; then
    print_yellow "⚠️ WARNING: PostgreSQL server version ($server_version) and pg_dump version ($pg_dump_version) have different major versions."
    print_yellow "⚠️ This may cause issues with database backups and migrations."
    return 1
  fi
  
  return 0
}

# Function to drop and recreate database
reset_database() {
  print_blue "🔄 Resetting test database..."
  PGPASSWORD=postgres dropdb -h localhost -p 5433 -U postgres ai-feed-test --if-exists
  PGPASSWORD=postgres createdb -h localhost -p 5433 -U postgres ai-feed-test
}

# Function to create a backup of the database
create_database_backup() {
  # Skip backup if SKIP_DB_BACKUP is set or versions mismatch
  if [ "$SKIP_DB_BACKUP" = "true" ]; then
    print_yellow "⚠️ Skipping database backup as SKIP_DB_BACKUP is set to true."
    return 0
  fi
  
  print_blue "💾 Creating database backup before migrations..."
  backup_file="ai-feed-test-backup-$(date +%Y%m%d%H%M%S).sql"
  
  if check_pg_versions; then
    PGPASSWORD=postgres pg_dump -h localhost -p 5433 -U postgres -d ai-feed-test -f "$backup_file"
    print_green "✅ Backup created: $backup_file"
  else
    print_yellow "⚠️ Skipping backup due to PostgreSQL version mismatch."
  fi
}

# Function to run database migrations
run_migrations() {
  print_blue "🔄 Running migrations..."
  # Set SKIP_DB_BACKUP to true when running migrations through our script
  SKIP_DB_BACKUP=true NODE_ENV=test npm run migrate -- --force
}

# Function to determine if a test is a client test
is_client_test() {
  local pattern=$1
  if [[ "$pattern" == *"components/"* || "$pattern" == *"pages/"* || "$pattern" == *"hooks/__tests__/"* || "$pattern" == *"context/"* ]]; then
    return 0  # True in bash
  else
    return 1  # False in bash
  fi
}

# Function to run client tests with database-free approach
run_client_tests() {
  local test_pattern=$1
  local pattern_display=$test_pattern
  
  if [ -z "$pattern_display" ]; then
    pattern_display="all client tests"
  fi
  
  print_blue "🧪 Running client tests: $pattern_display"
  
  # Always set SKIP_DB_INITIALIZED for client tests to avoid database dependencies
  export SKIP_DB_INITIALIZED=true
  export VITE_TEST_MODE=true
  
  # Run with a 60 second timeout at the script level
  # Increase individual test timeout from 5s to 15s to allow more time for component interaction tests
  if ! run_with_timeout 60 "NODE_ENV=test npx vitest run -c vitest.jsdom.config.ts $test_pattern --reporter=verbose --testTimeout=15000 > \"$client_output\" 2>&1" "Client tests"; then
    print_red "❌ Client tests failed or timed out. Output:"
    cat "$client_output"
    return 1
  fi
  
  print_green "✅ Client tests passed!"
  cat "$client_output"
  return 0
}

# Function to run server tests with proper database initialization
run_server_tests() {
  local test_pattern=$1
  local pattern_display=$test_pattern
  
  if [ -z "$pattern_display" ]; then
    pattern_display="all server tests"
  fi
  
  print_blue "🧪 Running server tests: $pattern_display"
  
  # Run with a 120 second timeout (server tests might take longer due to DB)
  if ! run_with_timeout 120 "NODE_ENV=test npx vitest run -c vitest.config.ts $test_pattern --reporter=verbose > \"$server_output\" 2>&1" "Server tests"; then
    print_red "❌ Server tests failed or timed out. Output:"
    cat "$server_output"
    return 1
  fi
  
  print_green "✅ Server tests passed!"
  cat "$server_output"
  return 0
}

# Main test execution logic
print_blue "📋 Starting test run..."

# Setup database for server tests unless skipped
if [ "$skip_db" = false ]; then
  # Only initialize database if we're running server tests or no pattern specified
  if ! is_client_test "$test_pattern" || [ -z "$test_pattern" ]; then
    print_blue "🔄 Initializing database for server tests..."
    # Reset and prepare database
    reset_database
    # Create backup (if requested and versions match)
    create_database_backup
    # Run migrations
    run_migrations
  else
    print_yellow "⚠️ Skipping database initialization (client tests only)"
  fi
else
  print_yellow "⚠️ Skipping database setup (--skip-db flag provided)"
fi

# If a test pattern is provided, run only those tests
if [ -n "$test_pattern" ]; then
  print_blue "🔍 Running tests matching pattern: $test_pattern"
  
  # Determine test type and run appropriate test command
  if is_client_test "$test_pattern"; then
    run_client_tests "$test_pattern"
  else
    run_server_tests "$test_pattern"
  fi
else
  # No pattern provided, run all tests
  failed=false
  
  # Run server tests first
  print_blue "🧪 Running all server tests..."
  if ! run_server_tests ""; then
    print_red "❌ Some server tests failed."
    failed=true
  fi
  
  # Then run client tests
  print_blue "🧪 Running all client tests..."
  if ! run_client_tests ""; then
    print_red "❌ Some client tests failed."
    failed=true
  fi
  
  # Final result
  if [ "$failed" = true ]; then
    print_red "❌ Test suite failed! Review output above for details."
    exit 1
  fi
fi

print_green "✅ All tests completed successfully!"
exit 0