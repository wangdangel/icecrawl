#!/usr/bin/env node

/**
 * Version Analyzer Script
 * 
 * Analyzes git commits to determine appropriate semantic version bump.
 * Uses conventional commit format: https://www.conventionalcommits.org/
 * 
 * Usage:
 *   node scripts/version-analyzer.js
 * 
 * Output:
 *   Prints the recommended version bump (major, minor, patch)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the current version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const currentVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
console.log(`Current version: ${currentVersion}`);

// Get the latest tag or initial commit if no tags exist
let latestTag;
try {
  latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  console.log(`Latest tag: ${latestTag}`);
} catch (error) {
  console.log('No tags found, using initial commit');
  latestTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim();
}

// Get all commits since the latest tag
const commitRange = latestTag ? `${latestTag}..HEAD` : '';
const commitLog = execSync(`git log ${commitRange} --pretty=format:"%s"`, { encoding: 'utf8' });
const commits = commitLog.split('\n').filter(Boolean);

console.log(`Analyzing ${commits.length} commits since ${latestTag || 'initial commit'}`);

// Check for breaking changes, features, and bug fixes
let hasMajorChanges = false;
let hasMinorChanges = false;
let hasPatchChanges = false;

// Regular expressions for conventional commit prefixes
const majorPattern = /^(feat|fix|refactor|perf)!:|BREAKING CHANGE:/i;
const minorPattern = /^feat(\([^)]+\))?:/i;
const patchPattern = /^(fix|perf|refactor|style)(\([^)]+\))?:/i;

// Analyze each commit
commits.forEach(commit => {
  if (majorPattern.test(commit)) {
    hasMajorChanges = true;
    console.log(`Major change found: ${commit}`);
  } else if (minorPattern.test(commit)) {
    hasMinorChanges = true;
    console.log(`Minor change found: ${commit}`);
  } else if (patchPattern.test(commit)) {
    hasPatchChanges = true;
    console.log(`Patch change found: ${commit}`);
  }
});

// Determine version bump based on changes found
let versionBump = 'patch'; // Default to patch
if (hasMajorChanges) {
  versionBump = 'major';
} else if (hasMinorChanges) {
  versionBump = 'minor';
} else if (hasPatchChanges) {
  versionBump = 'patch';
} else if (commits.length > 0) {
  console.log('No conventional commits found, defaulting to patch');
  versionBump = 'patch';
} else {
  console.log('No commits found, no version bump needed');
  versionBump = null;
}

// Calculate the new version
if (versionBump) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let newVersion;
  
  switch (versionBump) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  console.log(`Recommended version bump: ${versionBump}`);
  console.log(`New version would be: ${newVersion}`);
  
  // Output the result for CI/CD pipeline
  console.log(`::set-output name=version_bump::${versionBump}`);
  console.log(`::set-output name=new_version::${newVersion}`);
} else {
  console.log('No version bump needed');
  console.log('::set-output name=version_bump::none');
  console.log(`::set-output name=new_version::${currentVersion}`);
}
