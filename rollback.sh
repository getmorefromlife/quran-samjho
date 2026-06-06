#!/usr/bin/env bash
set -euo pipefail

# Rollback to previous deployment
# Usage: ./rollback.sh [tag]

TAG="${1:-rollback-before-bismillah}"

echo "=== Rolling back to tag: $TAG ==="

# Check out the files from the tag
echo "1. Restoring src/components/VerseReader.tsx from $TAG..."
git checkout "$TAG" -- src/components/VerseReader.tsx

echo "2. Building previous version..."
npm run build

echo "3. Deploying previous version..."
npx gh-pages -d out -t -m "rollback: revert to $TAG"

echo "=== Rollback complete ==="
echo "GitHub Pages will update in 1-2 minutes."
echo "To restore the latest version later: git checkout main -- src/components/VerseReader.tsx"
