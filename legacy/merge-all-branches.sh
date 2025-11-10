#!/bin/bash
# Merge all branches into main

set -e

cd "$(dirname "$0")/.."

echo "=== Current branch ==="
git branch --show-current

echo ""
echo "=== All local branches ==="
git branch

echo ""
echo "=== Switching to main ==="
git checkout main

echo ""
echo "=== Merging branches ==="

BRANCHES=("chore-push-hTRk4" "chore-push-JfgaZ" "chore-push-zIfdm" "sync-github-mxDXS")

for branch in "${BRANCHES[@]}"; do
  if git show-ref --verify --quiet refs/heads/"$branch"; then
    echo "Merging $branch..."
    if git merge "$branch" --no-edit; then
      echo "✅ Successfully merged $branch"
    else
      echo "⚠️  Merge conflict or issue with $branch - check manually"
    fi
  else
    echo "⚠️  Branch $branch does not exist, skipping"
  fi
done

echo ""
echo "=== Cleaning up merged branches ==="
for branch in "${BRANCHES[@]}"; do
  if git show-ref --verify --quiet refs/heads/"$branch"; then
    git branch -d "$branch" 2>&1 || echo "Could not delete $branch (may have unmerged changes)"
  fi
done

echo ""
echo "=== Final branch status ==="
git branch

echo ""
echo "=== Pushing to GitHub ==="
git push origin main

echo ""
echo "✅ Merge complete!"

