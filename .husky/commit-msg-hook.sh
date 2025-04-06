#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Get the commit message
commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Define regex pattern for conventional commits
# Format: type(scope): description
conventional_pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9 -]+\))?: .{1,100}$"

# Check if commit message matches the pattern
if ! echo "$commit_msg" | grep -qE "$conventional_pattern"; then
  echo "❌ Invalid commit message format."
  echo "The commit message should match format: type(scope): description"
  echo ""
  echo "Available types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
  echo "Example: feat(auth): add user registration endpoint"
  echo ""
  echo "Your commit message was:"
  echo "$commit_msg"
  exit 1
fi

# If we get here, the commit message is valid
echo "✅ Commit message follows conventional format"
