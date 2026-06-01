#!/usr/bin/env bash
# Delete merged/stale remote cursor/* agent branches (keeps main).
set -euo pipefail

git fetch origin --prune

while IFS= read -r branch; do
  [[ -z "$branch" ]] && continue
  echo "Deleting origin/${branch}..."
  git push origin --delete "$branch" || true
done < <(git branch -r | sed -n 's|^[[:space:]]*origin/||p' | grep '^cursor/' | sort -u)

echo "Done. Remaining remote branches:"
git branch -r | grep -v HEAD || true
