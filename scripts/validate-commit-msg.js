#!/usr/bin/env node

/**
 * Validate Commit Message Script
 *
 * Validates that commit messages follow the conventional commits format.
 * https://www.conventionalcommits.org/
 *
 * Usage:
 *   node scripts/validate-commit-msg.js .git/COMMIT_EDITMSG
 */

const fs = require('fs');

// Get the commit message file path from args
const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
  console.error('Error: No commit message file provided');
  process.exit(1);
}

try {
  // Read the commit message from the file
  const commitMsg = fs.readFileSync(commitMsgFile, 'utf8').trim();

  // Skip validation for merge and revert commits
  if (commitMsg.startsWith('Merge ') || commitMsg.startsWith('Revert ')) {
    console.log('✅ Merge or revert commit detected, skipping validation');
    process.exit(0);
  }

  // Define the conventional commit pattern
  // Format: type(scope): description
  const conventionalPattern =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9 -]+\))?: .{1,100}$/;

  // Check if the commit message matches the pattern
  if (!conventionalPattern.test(commitMsg)) {
    console.error('❌ Invalid commit message format.');
    console.error('The commit message should follow format: type(scope): description');
    console.error('');
    console.error(
      'Available types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert',
    );
    console.error('Example: feat(auth): add user registration endpoint');
    console.error('');
    console.error('Your commit message was:');
    console.error(commitMsg);
    process.exit(1);
  }

  // If commit message contains BREAKING CHANGE: or has ! after type, mark as major change
  if (commitMsg.includes('BREAKING CHANGE:') || /^(feat|fix|refactor|perf)!:/.test(commitMsg)) {
    console.log('⚠️ Breaking change detected!');
  }

  console.log('✅ Commit message follows conventional format');
  process.exit(0);
} catch (error) {
  console.error('Error validating commit message:', error.message);
  process.exit(1);
}
