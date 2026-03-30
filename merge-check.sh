#!/bin/bash
set -e

echo "=== VIGIL Merge Check ==="

if ! git diff --quiet HEAD; then
  echo "ERROR: Uncommitted changes detected"
  git diff --stat
  exit 1
fi

git fetch origin main
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "ERROR: Branch is not up to date with main"
  echo "Local:  $LOCAL"
  echo "Remote: $REMOTE"
  exit 1
fi

echo "Merge check passed - ready for PR"
exit 0

