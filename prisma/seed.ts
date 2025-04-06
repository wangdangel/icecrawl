import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const defaultUsername = 'admin';
  const defaultPassword = 'password'; // Consider making this configurable via environment variables

  // Check if the default user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: defaultUsername },
  });

  if (existingUser) {
    console.log(`User '${defaultUsername}' already exists. Skipping seeding.`);
  } else {
    // Hash the password
    const saltRounds = 10; // Same as in EnhancedUserService
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

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

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
