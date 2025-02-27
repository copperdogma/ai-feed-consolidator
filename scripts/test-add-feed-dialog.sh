#!/bin/bash

echo "Running AddFeedDialog tests 10 times..."
echo

for i in {1..10}; do
  echo "Run #$i"
  echo "-------"
  echo
  npm test src/components/feed-management/__tests__/AddFeedDialog.test.tsx
  echo
done

echo "Test run complete" 