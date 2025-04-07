#!/usr/bin/env node

/**
 * Global Postinstall Script for Icecrawl
 * 
 * This script runs automatically after global install to:
 * - Create a default data directory in the user's home/Documents
 * - Generate a .env file with secure defaults
 * - Run Prisma migrations targeting that directory
 * - Seed initial data
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function getDefaultDataDir() {
  const homeDir = os.homedir();
  if (process.platform === 'win32') {
    return path.join(homeDir, 'Documents', 'Icecrawl');
  } else {
    return path.join(homeDir, 'Icecrawl');
  }
}

function run(command, options = {}) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (err) {
    console.error(`Error running command: ${command}`);
    console.error(err.message);
    process.exit(1);
  }
}

function main() {
  const dataDir = getDefaultDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory at ${dataDir}`);
  } else {
    console.log(`Data directory already exists at ${dataDir}`);
  }

  const envPath = path.join(dataDir, '.env');
  if (!fs.existsSync(envPath)) {
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const envContent = `# Icecrawl Environment

DATABASE_URL="file:./icecrawl.db"
JWT_SECRET="${jwtSecret}"
PORT=6969
NODE_ENV=production
LOG_LEVEL=info
`;
    fs.writeFileSync(envPath, envContent);
    console.log(`Created .env file at ${envPath}`);
  } else {
    console.log(`.env file already exists at ${envPath}`);
  }

  const globalNodeModules = path.resolve(__dirname, '..');
  const prismaSchemaPath = path.join(globalNodeModules, 'prisma', 'schema.prisma');
  const seedScriptPath = path.join(globalNodeModules, 'prisma', 'seed.ts');

  // Run Prisma migrate deploy
  run(`npx prisma migrate deploy --schema="${prismaSchemaPath}"`, { cwd: dataDir });

  // Run Prisma seed
  run(`npx ts-node "${seedScriptPath}"`, { cwd: dataDir });

  console.log('✅ Global Icecrawl setup complete.');
  console.log(`Data directory: ${dataDir}`);
  console.log('You can now run `icecrawl` or `icecrawl-mcp` from anywhere.');
}

main();
