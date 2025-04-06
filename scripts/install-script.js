#!/usr/bin/env node

/**
 * Installation Script
 * 
 * This script performs a complete setup of the application:
 * 1. Installs dependencies
 * 2. Generates Prisma client
 * 3. Sets up database and migrations
 * 4. Creates default admin user
 * 5. Builds the application
 * 6. Sets up Git hooks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const defaultDbUrl = 'file:./dev.db';

/**
 * Helper function to prompt for input
 */
function prompt(question, defaultValue) {
  return new Promise(resolve => {
    rl.question(`${question} (${defaultValue}): `, answer => {
      resolve(answer || defaultValue);
    });
  });
}

/**
 * Run command and handle errors
 */
function runCommand(command, errorMessage) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\n❌ ${errorMessage}`);
    console.error(error.message);
    return false;
  }
}

/**
 * Main installation function
 */
async function main() {
  console.log('🚀 Starting Web Scraper installation...\n');
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  let envExists = fs.existsSync(envPath);
  
  if (!envExists) {
    console.log('Creating .env file...');
    
    // Prompt for configuration
    const dbUrl = await prompt('Database URL', defaultDbUrl);
    const jwtSecret = require('crypto').randomBytes(32).toString('hex');
    const port = await prompt('Server port', 6969);
    
    // Create .env file
    const envContent = `# Database connection
DATABASE_URL="${dbUrl}"

# JWT Secret for authentication
JWT_SECRET="${jwtSecret}"

# Server configuration
PORT=${port}
NODE_ENV=development

# Logging level
LOG_LEVEL=info`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created.');
  } else {
    console.log('✅ .env file already exists.');
  }
  
  // Install dependencies
  console.log('\nInstalling dependencies...');
  if (!runCommand('npm install', 'Failed to install dependencies.')) {
    process.exit(1);
  }
  console.log('✅ Dependencies installed.');
  
  // Generate Prisma client
  console.log('\nGenerating Prisma client...');
  if (!runCommand('npx prisma generate', 'Failed to generate Prisma client.')) {
    process.exit(1);
  }
  console.log('✅ Prisma client generated.');
  
  // Setup database and migrations
  console.log('\nSetting up database...');
  if (!runCommand('node scripts/setup-database.js', 'Failed to set up database.')) {
    process.exit(1);
  }
  console.log('✅ Database setup completed.');
  
  // Setup Husky
  console.log('\nSetting up Git hooks...');
  if (!runCommand('npx husky install', 'Failed to install Husky.')) {
    process.exit(1);
  }
  console.log('✅ Git hooks setup completed.');
  
  // Build the application
  console.log('\nBuilding the application...');
  if (!runCommand('npm run build', 'Failed to build the application.')) {
    process.exit(1);
  }
  console.log('✅ Application built successfully.');
  
  // Build dashboard
  console.log('\nBuilding the dashboard...');
  if (!runCommand('npm run build:dashboard', 'Failed to build the dashboard.')) {
    process.exit(1);
  }
  console.log('✅ Dashboard built successfully.');
  
  console.log('\n🎉 Installation completed successfully!');
  console.log('\nYou can now start the application with:');
  console.log('  npm start');
  console.log('\nOr run in development mode with:');
  console.log('  npm run dev');
  console.log('\nThe dashboard will be available at:');
  console.log('  http://localhost:<PORT>/dashboard');
  
  rl.close();
}

main().catch(error => {
  console.error('Installation failed:', error);
  process.exit(1);
});
