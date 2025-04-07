#!/usr/bin/env node

/**
 * Global Postinstall Script for Icecrawl (Optimized for Global Installs)
 * * This script runs automatically after installation. It performs setup steps ONLY
 * if it detects it's running in a global installation context.
 * * - Checks if running globally. Exits if not.
 * - Creates a default data directory (~/Icecrawl or ~/Documents/Icecrawl).
 * - Generates a .env file with secure defaults in the data directory.
 * - Runs Prisma migrations targeting the database file in the data directory.
 * - Generates the Prisma Client.
 * - Runs the compiled database seed script (prisma/seed.js).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Determines the default data directory path based on the operating system.
 * On Windows, it uses Documents/Icecrawl; otherwise, ~/Icecrawl.
 * @returns {string} The absolute path to the default data directory.
 */
function getDefaultDataDir() {
  const homeDir = os.homedir();
  if (process.platform === 'win32') {
    return path.join(homeDir, 'Documents', 'Icecrawl');
  } else {
    // Assume Linux, macOS, or other Unix-like systems
    return path.join(homeDir, 'Icecrawl');
  }
}

/**
 * Executes a shell command synchronously, inheriting stdio.
 * Exits the script with an error code if the command fails.
 * @param {string} command - The command string to execute.
 * @param {object} [options] - Options for child_process.execSync (e.g., cwd).
 */
function run(command, options = {}) {
  console.log(`Running: ${command}`);
  try {
    // Inherit stdio to show command output/errors directly in the terminal
    execSync(command, { stdio: 'inherit', ...options });
  } catch (err) {
    console.error(`Error running command: ${command}`);
    // Log the error message from the failed command or the error object itself
    console.error(err.message || err);
    process.exit(1); // Exit the postinstall script indicating failure
  }
}

/**
 * Uses Node's require.resolve mechanism to find the absolute path
 * to the Prisma CLI binary installed as a dependency.
 * Handles different 'bin' formats in package.json.
 * @returns {string|null} Absolute path to the binary or null if not found.
 */
function getPrismaBinPath() {
  try {
    // 1. Find the path to prisma's package.json using Node's resolution
    const prismaPkgJsonPath = require.resolve('prisma/package.json');
    // 2. Read its package.json content
    const prismaPkgJson = JSON.parse(fs.readFileSync(prismaPkgJsonPath, 'utf8'));
    // 3. Get the 'bin' definition (can be a string or an object)
    const binDefinition = prismaPkgJson.bin;

    // 4. Determine the relative script path from the 'bin' definition
    const binScript = typeof binDefinition === 'string'
      ? binDefinition // If 'bin' is just a string path
      : binDefinition?.prisma; // If 'bin' is an object, get the path associated with the 'prisma' command key

    if (!binScript) {
      throw new Error("Could not determine Prisma binary script path from its package.json 'bin' field.");
    }

    // 5. Construct the absolute path to the binary script file
    const prismaPackageDir = path.dirname(prismaPkgJsonPath);
    const absoluteBinPath = path.resolve(prismaPackageDir, binScript);

    return absoluteBinPath;

  } catch (err) {
    // Log error if resolution fails (e.g., prisma not installed correctly)
    console.error("Error trying to locate the installed Prisma CLI:", err);
    return null; // Indicate failure to find the path
  }
}

// --- Main Execution Logic ---
function main() {
  // --- Step 1: Check if running in global context ---
  const isGlobal = process.env.npm_config_global === 'true';

  if (!isGlobal) {
    // If installed locally (e.g., in a project's node_modules), do nothing.
    console.log('Icecrawl detected local installation. Skipping global setup script.');
    process.exit(0); // Exit successfully without performing setup.
  }

  // Proceed only if installed globally.
  console.log('Icecrawl detected global installation. Running setup...');

  // --- Step 2: Determine and Ensure Data Directory ---
  const dataDir = getDefaultDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory at ${dataDir}`);
  } else {
    console.log(`Data directory already exists at ${dataDir}`);
  }

  // --- Step 3: Ensure .env File in Data Directory ---
  const envPath = path.join(dataDir, '.env');
  if (!fs.existsSync(envPath)) {
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    // Define default environment variables for the global installation
    const envContent = `# Icecrawl Environment (Auto-generated for global install)
# Database file is relative to this directory: ${dataDir}

DATABASE_URL="file:./icecrawl.db"
JWT_SECRET="${jwtSecret}" # Auto-generated secure JWT secret
PORT=6971                 # Default API/Dashboard port
NODE_ENV=production       # Default environment mode
LOG_LEVEL=info            # Default logging level
`;
    fs.writeFileSync(envPath, envContent);
    console.log(`Created default .env file at ${envPath}`);
  } else {
    console.log(`.env file already exists at ${envPath}`);
  }

  // --- Step 4: Define Necessary Paths ---
  // Get the root directory of the globally installed icecrawl package
  const globalPackageRoot = path.resolve(__dirname, '..');
  // Path to the prisma schema within the installed package
  const prismaSchemaPath = path.join(globalPackageRoot, 'prisma', 'schema.prisma');
  // Path to the COMPILED seed script within the installed package
  const compiledSeedScriptPath = path.join(globalPackageRoot, 'prisma', 'seed.js');
  // Dynamically find the path to the installed Prisma binary
  const prismaBinPath = getPrismaBinPath();

  // --- Step 5: Validate Prisma Binary Path ---
  if (!prismaBinPath || !fs.existsSync(prismaBinPath)) {
    console.error(`Error: Could not find or access the installed Prisma CLI binary.`);
    console.error(`Attempted path resolution result: ${prismaBinPath || 'Could not resolve'}`);
    console.error('Ensure Prisma is listed as a dependency in icecrawl\'s package.json.');
    process.exit(1); // Exit with error if Prisma CLI can't be found
  }
  console.log(`Using Prisma binary found at: ${prismaBinPath}`);

  // --- Step 6: Run Prisma Migrate Deploy ---
  console.log('Applying database migrations (if any)...');
  // Run the command *within* the data directory (cwd) so it finds the .env and database file
  run(`node "${prismaBinPath}" migrate deploy --schema="${prismaSchemaPath}"`, { cwd: dataDir });

  // --- Step 7: Run Prisma Generate ---
  // This is crucial to generate the client code needed by the seed script
  console.log('Generating Prisma Client...');
  // Run this relative to the package root, providing the schema path explicitly
  run(`node "${prismaBinPath}" generate --schema="${prismaSchemaPath}"`, { cwd: globalPackageRoot });

  // --- Step 8: Run Database Seeding ---
  if (!fs.existsSync(compiledSeedScriptPath)) {
    // Warn but don't fail if the compiled seed script is missing
    console.warn(`Warning: Compiled seed script not found at ${compiledSeedScriptPath}. Skipping database seeding.`);
    console.warn(`Ensure 'prisma/seed.ts' is compiled to 'prisma/seed.js' during the 'npm run build' process.`);
  } else {
    console.log('Seeding initial database data (if applicable)...');
    // Run the seed script *within* the data directory so it uses the correct .env/database
    run(`node "${compiledSeedScriptPath}"`, { cwd: dataDir });
  }

  // --- Step 9: Completion ---
  console.log('✅ Global Icecrawl setup complete.');
  console.log(`Data and configuration directory: ${dataDir}`);
  console.log('You can now run `icecrawl` or `icecrawl-mcp` from anywhere.');
}

// Execute the main function to start the setup process
main();