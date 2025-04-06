#!/usr/bin/env node

/**
 * Husky Setup Script
 * 
 * Sets up husky git hooks for the project.
 * This script should be run after npm install.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create .husky directory if it doesn't exist
const huskyDir = path.join(__dirname, '..', '.husky');
if (!fs.existsSync(huskyDir)) {
  fs.mkdirSync(huskyDir, { recursive: true });
}

// Initialize husky
try {
  console.log('Initializing husky...');
  execSync('npx husky install', { stdio: 'inherit' });
  
  // Add commit-msg hook
  console.log('Setting up commit-msg hook...');
  const commitMsgPath = path.join(huskyDir, 'commit-msg');
  
  // Only create the hook if it doesn't exist or is different
  if (!fs.existsSync(commitMsgPath)) {
    execSync('npx husky add .husky/commit-msg "node scripts/validate-commit-msg.js $1"', { stdio: 'inherit' });
    console.log('Created commit-msg hook');
  } else {
    console.log('commit-msg hook already exists');
  }
  
  // Add pre-commit hook
  console.log('Setting up pre-commit hook...');
  const preCommitPath = path.join(huskyDir, 'pre-commit');
  
  // Only create the hook if it doesn't exist or is different
  if (!fs.existsSync(preCommitPath)) {
    execSync('npx husky add .husky/pre-commit "npm run lint && npm run test:quick"', { stdio: 'inherit' });
    console.log('Created pre-commit hook');
  } else {
    console.log('pre-commit hook already exists');
  }
  
  // Make hooks executable
  execSync('chmod +x .husky/commit-msg .husky/pre-commit', { stdio: 'inherit' });
  
  console.log('✅ Husky setup complete');
} catch (error) {
  console.error('Error setting up husky:', error.message);
  process.exit(1);
}
