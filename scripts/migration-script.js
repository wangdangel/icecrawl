#!/usr/bin/env node

/**
 * Database Setup Script
 *
 * This script sets up the initial database schema and creates a default admin user.
 * Run this script after installing dependencies and before starting the application.
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Configuration
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database setup...');

    // Run Prisma migrations
    console.log('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'admin',
      },
    });

    if (existingAdmin) {
      console.log('Admin user already exists, skipping creation.');
    } else {
      // Create admin user
      console.log('Creating admin user...');

      // Hash password
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

      // Create user
      const admin = await prisma.user.create({
        data: {
          username: DEFAULT_ADMIN_USERNAME,
          password: hashedPassword,
          email: DEFAULT_ADMIN_EMAIL,
          role: 'admin',
          isActive: true,
        },
      });

      console.log(`Admin user created with username: ${admin.username}`);

      if (process.env.DEFAULT_ADMIN_PASSWORD) {
        console.log('Using admin password from environment variable.');
      } else {
        console.log(`Generated admin password: ${DEFAULT_ADMIN_PASSWORD}`);
        console.log('Please save this password as it will not be shown again.');
      }
    }

    // Create default tags
    console.log('Creating default tags...');
    const defaultTags = [
      { name: 'Important', color: '#EF4444' }, // Red
      { name: 'Research', color: '#3B82F6' }, // Blue
      { name: 'Reference', color: '#10B981' }, // Green
      { name: 'Personal', color: '#8B5CF6' }, // Purple
      { name: 'Work', color: '#F59E0B' }, // Yellow
    ];

    for (const tag of defaultTags) {
      await prisma.tag.upsert({
        where: { name: tag.name },
        update: { color: tag.color },
        create: { name: tag.name, color: tag.color },
      });
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
