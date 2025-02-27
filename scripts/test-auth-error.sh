#!/bin/bash

echo "Running auth error tests 10 times..."
echo

for i in {1..10}; do
  echo "Run #$i"
  echo "-------"
  echo
  npm test src/server/__tests__/auth-error.test.ts
  echo
done

echo "Test run complete" 