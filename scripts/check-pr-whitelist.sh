#!/usr/bin/env bash
# Production whitelist guard — run BEFORE pushing a branch you intend
# to PR into main. Fails if ANY tracked file on the current HEAD falls
# outside the production whitelist (the file set main may carry).
#
# It checks the full tree, not just the diff, so it also catches
# branches cut from an old main that still carried dev files.
#
# Usage (works from any branch):
#   git show main-full-dev:scripts/check-pr-whitelist.sh | bash
# or, on the dev branch itself:
#   bash scripts/check-pr-whitelist.sh

set -euo pipefail

WHITELIST='^(\.github/.*|\.vscode/.*|public/.*|src/.*|\.gitignore|CONTRIBUTING\.md|Caddyfile|LICENSE|README\.md|components\.json|eslint\.config\.mjs|example\.env\.local|next-env\.d\.ts|next\.config\.ts|package\.json|postcss\.config\.mjs|tailwind\.config\.ts|tsconfig\.json|vercel\.json)$'

branch=$(git branch --show-current)
echo "Whitelist guard on ${branch:-detached HEAD} @ $(git rev-parse --short HEAD)"

mapfile -t files < <(git ls-tree -r --name-only HEAD)
bad=()
for f in "${files[@]}"; do
  [[ "$f" =~ $WHITELIST ]] || bad+=("$f")
done

if (( ${#bad[@]} )); then
  echo
  echo "FAIL: ${#bad[@]} tracked file(s) outside the production whitelist:"
  printf '  %s\n' "${bad[@]}"
  echo
  echo "main carries production files only. Keep these files on"
  echo "main-full-dev and cut the production PR from a main-based branch."
  exit 1
fi

echo "PASS: ${#files[@]} tracked files, all inside the whitelist."

if git rev-parse --verify -q origin/main >/dev/null 2>&1; then
  base=$(git merge-base origin/main HEAD)
  count=$(git diff --name-only "$base" HEAD | wc -l)
  echo "PR preview: ${count} file(s) changed vs the merge-base with origin/main."
fi
