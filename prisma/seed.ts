// --- Environment Loading ---
// Import necessary modules for loading environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';

// Determine the path to the .env file based on the current working directory (process.cwd())
// The postinstall script should set cwd correctly before executing this seed script.
const envPath = path.resolve(process.cwd(), '.env');

// Attempt to load the environment variables from the resolved .env file path
const envConfig = dotenv.config({ path: envPath });

// Log whether the .env file was loaded successfully or if there was an error
if (envConfig.error) {
  console.warn(`Warning: Could not load .env file from ${envPath}:`, envConfig.error);
  // Depending on your needs, you might want to exit if .env is crucial
  // process.exit(1);
} else {
  console.log(`.env file loaded successfully from: ${envPath}`);
}

// Optional: Log to confirm if DATABASE_URL is actually set now
// console.log(`DATABASE_URL after dotenv: ${process.env.DATABASE_URL ? 'Loaded' : 'MISSING!'}`);

// --- Seeding Logic ---
// Now import PrismaClient and bcrypt AFTER dotenv has run
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Instantiate Prisma Client - it will now use the loaded DATABASE_URL
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Crucial Check: Ensure DATABASE_URL was actually loaded before making DB calls
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'FATAL: DATABASE_URL environment variable is not set. Check .env file and loading process.',
    );
  }

  const defaultUsername = 'admin';
  const defaultPassword = 'password'; // Consider making this configurable via environment variables

  try {
    // Check if the default user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: defaultUsername },
    });

    if (existingUser) {
      console.log(`User '${defaultUsername}' already exists. Skipping seeding.`);
    } else {
      // Hash the password
      const saltRounds = 10; // Same as in EnhancedUserService
      console.log(`Hashing password for user '${defaultUsername}'...`);
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
      console.log(`Password hashed. Creating user...`);

      // Create the user
      const user = await prisma.user.create({
        data: {
          username: defaultUsername,
          password: hashedPassword,
          role: 'admin', // Make the default user an admin
          email: 'admin@example.com', // Optional: provide a default email
          isActive: true,
        },
      });
      console.log(`Created default admin user with username: ${user.username}`);
    }
  } catch (error) {
    console.error('Error during seeding process:', error);
    throw error; // Re-throw the error to be caught by the final catch block
  }

  console.log(`Seeding finished.`);
}

// Execute the main seeding function and handle potential errors/cleanup
main()
  .catch(e => {
    console.error('Seeding script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ensure Prisma Client disconnects gracefully
    console.log('Disconnecting Prisma Client...');
    await prisma.$disconnect();
    console.log('Prisma Client disconnected.');
  });
