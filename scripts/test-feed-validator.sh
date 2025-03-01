#!/bin/bash

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test configuration
NUM_RUNS=10
TEST_FILE="src/tests/enhanced-feed-validator.test.ts"
RESULTS_FILE="feed-validator-test-results.log"

# Initialize results tracking
total_runs=0
successful_runs=0
failed_runs=0

echo -e "${BLUE}Running EnhancedFeedValidator tests $NUM_RUNS times...${NC}"
echo "Results will be logged to $RESULTS_FILE"
echo

# Clear previous results
> "$RESULTS_FILE"

for i in $(seq 1 $NUM_RUNS); do
    echo -e "${YELLOW}Run #$i${NC}"
    echo "-------"
    
    # Run the specific test file with debug logging enabled
    DEBUG=msw:*,feed-validator:* npm run test $TEST_FILE 2>&1 | tee -a "$RESULTS_FILE"
    
    # Capture exit code (must use PIPESTATUS because of tee)
    EXIT_CODE=${PIPESTATUS[0]}
    total_runs=$((total_runs + 1))
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Test passed${NC}"
        successful_runs=$((successful_runs + 1))
    else
        echo -e "${RED}❌ Test failed with exit code $EXIT_CODE${NC}"
        failed_runs=$((failed_runs + 1))
        
        # Extract error details from the log
        echo "Error details:" >> "$RESULTS_FILE"
        grep -A 5 "FAIL" "$RESULTS_FILE" | tail -n 6 >> "$RESULTS_FILE"
        echo "----------------------------------------" >> "$RESULTS_FILE"
    fi
    echo
    
    # Small delay between runs to ensure cleanup
    sleep 1
done

# Print summary
echo -e "${BLUE}Test Run Summary${NC}"
echo "----------------"
echo -e "Total runs: ${YELLOW}$total_runs${NC}"
echo -e "Successful: ${GREEN}$successful_runs${NC}"
echo -e "Failed: ${RED}$failed_runs${NC}"
echo -e "Success rate: ${YELLOW}$(( (successful_runs * 100) / total_runs ))%${NC}"
echo

if [ $failed_runs -gt 0 ]; then
    echo -e "${RED}Some tests failed. Check $RESULTS_FILE for details.${NC}"
    exit 1
else
    echo -e "${GREEN}All test runs passed successfully!${NC}"
    exit 0
fi 