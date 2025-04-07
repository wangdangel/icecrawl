import bcrypt from 'bcrypt';
// Remove local PrismaClient import
import prisma from '../db/prismaClient'; // Import shared instance
import logger from '../utils/logger';

// Remove local prisma instantiation

// Re-define interfaces here or import from a shared types file if created later
export interface User {
  id: string;
  username: string;
  password?: string; // Keep password for internal use if needed by other services
  role: 'admin' | 'user';
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  resetToken?: string | null; // Prisma expects null for optional relations/fields
  resetTokenExpiry?: Date | null;
}

export interface UserCreateData {
  username: string;
  password: string; // Password needed for hashing during creation
  role?: 'admin' | 'user';
  email?: string;
}

export interface UserUpdateData {
  username?: string;
  password?: string; // Password needed for hashing if updated
  role?: 'admin' | 'user';
  email?: string;
  isActive?: boolean;
}

// Type for user data returned externally (without password)
export type SafeUser = Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry'>;


export class UserService {
  /**
   * Get a user by ID (returns safe user data)
   *
   * @param id - User ID
   * @returns SafeUser or null if not found
   */
  static async getUserById(id: string): Promise<SafeUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          role: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          isActive: true,
        },
      });

      // Cast to SafeUser before returning
      return user as SafeUser | null;
    } catch (error) {
      logger.error({
        message: 'Error getting user by ID',
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get a user by username (returns full user data including password hash)
   * Intended for internal use (e.g., authentication)
   *
   * @param username - Username
   * @returns User or null if not found
   */
  static async getUserByUsernameInternal(username: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });

      return user as User | null;
    } catch (error) {
      logger.error({
        message: 'Error getting internal user by username',
        username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get a user by email (returns full user data including password hash)
   * Intended for internal use (e.g., password reset)
   *
   * @param email - Email address
   * @returns User or null if not found
   */
  static async getUserByEmailInternal(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { email },
      });

      return user as User | null;
    } catch (error) {
      logger.error({
        message: 'Error getting internal user by email',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get all users with pagination (returns safe user data)
   *
   * @param page - Page number (starts from 1)
   * @param limit - Number of users per page
   * @param filters - Optional filters for username, role, etc.
   * @returns Array of safe users and count
   */
  static async getAllUsers(
    page = 1,
    limit = 10,
    filters: { username?: string; role?: string; isActive?: boolean } = {}
  ): Promise<{ users: SafeUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause from filters
      const where: any = {};
      if (filters.username) {
        where.username = { contains: filters.username, mode: 'insensitive' }; // Case-insensitive search
      }
      if (filters.role) {
        where.role = filters.role;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Query users with pagination
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            role: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true,
            isActive: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      // Cast to SafeUser[] before returning
      return {
        users: users as SafeUser[],
        total,
      };
    } catch (error) {
      logger.error({
        message: 'Error getting all users',
        page,
        limit,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        users: [],
        total: 0,
      };
    }
  }

  /**
   * Create a new user (returns safe user data)
   *
   * @param userData - User data including plain password
   * @returns Created safe user
   */
  static async createUser(userData: UserCreateData): Promise<SafeUser> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          password: hashedPassword,
          role: userData.role || 'user',
          email: userData.email,
          isActive: true, // Default to active
        },
        select: {
          id: true,
          username: true,
          role: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          isActive: true,
        },
      });

      logger.info({
        message: 'User created',
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      // Cast to SafeUser before returning
      return user as SafeUser;
    } catch (error) {
      logger.error({
        message: 'Error creating user',
        username: userData.username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Check for unique constraint violation (e.g., username or email already exists)
      if (error instanceof Error && (error as any).code === 'P2002') {
         // Determine which field caused the violation if possible
         const target = (error as any).meta?.target;
         if (target && target.includes('username')) {
             throw new Error(`Username '${userData.username}' already exists.`);
         } else if (target && target.includes('email')) {
             throw new Error(`Email '${userData.email}' already registered.`);
         } else {
             throw new Error('User creation failed due to a conflict.');
         }
      }

      throw new Error('Failed to create user');
    }
  }

  /**
   * Update an existing user (returns safe user data)
   *
   * @param id - User ID
   * @param userData - User data to update (can include plain password)
   * @returns Updated safe user
   */
  static async updateUser(id: string, userData: UserUpdateData): Promise<SafeUser> {
    try {
      // Prepare data for update
      const updateData: any = { ...userData };

      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Update user
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          role: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          isActive: true,
        },
      });

      logger.info({
        message: 'User updated',
        userId: user.id,
        username: user.username,
      });

      // Cast to SafeUser before returning
      return user as SafeUser;
    } catch (error) {
      logger.error({
        message: 'Error updating user',
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

       // Check for unique constraint violation on update
       if (error instanceof Error && (error as any).code === 'P2002') {
          const target = (error as any).meta?.target;
          if (target && target.includes('username')) {
              throw new Error(`Username '${userData.username}' already exists.`);
          } else if (target && target.includes('email')) {
              throw new Error(`Email '${userData.email}' already registered.`);
          } else {
              throw new Error('User update failed due to a conflict.');
          }
       }

      throw new Error('Failed to update user');
    }
  }

  /**
   * Deactivate a user (soft delete)
   *
   * @param id - User ID
   * @returns Success status
   */
  static async deleteUser(id: string): Promise<boolean> {
    try {
      // Soft delete by deactivating
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info({
        message: 'User deactivated',
        userId: id,
      });

      return true;
    } catch (error) {
      logger.error({
        message: 'Error deactivating user',
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * Permanently delete a user (admin only)
   *
   * @param id - User ID
   * @returns Success status
   */
  static async permanentlyDeleteUser(id: string): Promise<boolean> {
    try {
      // Ensure related data is handled (e.g., cascade delete or set null in schema)
      await prisma.user.delete({
        where: { id },
      });

      logger.info({
        message: 'User permanently deleted',
        userId: id,
      });

      return true;
    } catch (error) {
      logger.error({
        message: 'Error permanently deleting user',
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
       // Check for record not found error
       if (error instanceof Error && (error as any).code === 'P2025') {
           logger.warn(`Attempted to permanently delete non-existent user: ${id}`);
           return false; // Indicate failure as user didn't exist
       }
      return false;
    }
  }

   /**
   * Update the last login time for a user.
   * Should be called internally after successful authentication.
   *
   * @param userId - The ID of the user who logged in.
   * @returns Promise<void>
   */
   static async updateLastLogin(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() },
      });
    } catch (error) {
      // Log the error but don't prevent login flow
      logger.error({
        message: 'Failed to update last login time',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
