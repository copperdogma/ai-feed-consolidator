#!/bin/bash

set -e

# Terminal colors
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

print_blue "📋 Running client tests..."

# Set environment variables
export NODE_ENV=test
export SKIP_DB_INITIALIZED=true
export VITE_TEST_MODE=true

# Parse arguments
test_pattern="$1"
if [ -z "$test_pattern" ]; then
  # Running a specific valid test to start with
  print_yellow "⚠️ No test pattern specified. Running FeedDisplayNoDb test first..."
  test_pattern="src/components/__tests__/FeedDisplayNoDb.test.tsx"
else
  print_blue "🔍 Running tests matching: $test_pattern"
fi

# Run tests
print_blue "🧪 Executing tests..."
npx vitest run -c vitest.jsdom.config.ts "$test_pattern" --reporter=verbose

# Check exit code
if [ $? -eq 0 ]; then
  print_green "✅ All client tests passed!"
  
  # If we ran a specific test successfully, try running other components tests
  if [ "$test_pattern" == "src/components/__tests__/FeedDisplayNoDb.test.tsx" ]; then
    print_blue "🔄 Now trying to run other component tests individually..."
    
    # Get list of component test files
    component_tests=$(find src/components/__tests__ -name "*.test.tsx" ! -name "FeedDisplayNoDb.test.tsx")
    
    # Run each test separately
    for test_file in $component_tests; do
      print_blue "🧪 Running test: $test_file"
      # Use --threads=false to avoid concurrency issues
      NODE_ENV=test SKIP_DB_INITIALIZED=true npx vitest run -c vitest.jsdom.config.ts "$test_file" --reporter=verbose --threads=false
      
      # Don't exit on first failure, try all tests
      if [ $? -ne 0 ]; then
        print_red "❌ Test failed: $test_file"
        exit_code=1
      fi
    done
    
    # Check if we had any failures
    if [ -n "$exit_code" ]; then
      print_red "❌ Some component tests failed!"
      exit 1
    else
      print_green "✅ All component tests passed!"
    fi
  fi
  
  exit 0
else
  print_red "❌ Some client tests failed!"
  exit 1
fi 