import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { CacheService } from './cacheService.js';
import { sendEmail } from '../utils/email-utils.js';

const prisma = new PrismaClient();

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
}

/**
 * User creation data interface
 */
export interface UserCreateData {
  username: string;
  password: string;
  role?: 'admin' | 'user';
  email?: string;
}

/**
 * User update data interface
 */
export interface UserUpdateData {
  username?: string;
  password?: string;
  role?: 'admin' | 'user';
  email?: string;
  isActive?: boolean;
}

/**
 * Password reset request interface
 */
export interface PasswordResetRequest {
  email: string;
  token: string;
  expiry: Date;
}

/**
 * Enhanced user service with additional functionality
 */
export class EnhancedUserService {
  private static RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  /**
   * Get a user by ID
   * 
   * @param id - User ID
   * @returns User or null if not found
   */
  static async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
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
      
      return user as Omit<User, 'password'> | null;
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
   * Get a user by username
   * 
   * @param username - Username
   * @returns User or null if not found
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });
      
      return user as User | null;
    } catch (error) {
      logger.error({
        message: 'Error getting user by username',
        username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
  
  /**
   * Get a user by email
   * 
   * @param email - Email address
   * @returns User or null if not found
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { email },
      });
      
      return user as User | null;
    } catch (error) {
      logger.error({
        message: 'Error getting user by email',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
  
  /**
   * Get all users with pagination
   * 
   * @param page - Page number (starts from 1)
   * @param limit - Number of users per page
   * @param filters - Optional filters for username, role, etc.
   * @returns Array of users and count
   */
  static async getAllUsers(
    page = 1, 
    limit = 10,
    filters: { username?: string; role?: string; isActive?: boolean } = {}
  ): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Build where clause from filters
      const where: any = {};
      if (filters.username) {
        where.username = { contains: filters.username };
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
      
      return {
        users: users as Omit<User, 'password'>[],
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
   * Create a new user
   * 
   * @param userData - User data
   * @returns Created user
   */
  static async createUser(userData: UserCreateData): Promise<Omit<User, 'password'>> {
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
          isActive: true,
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
      
      return user as Omit<User, 'password'>;
    } catch (error) {
      logger.error({
        message: 'Error creating user',
        username: userData.username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new Error('Failed to create user');
    }
  }
  
  /**
   * Update an existing user
   * 
   * @param id - User ID
   * @param userData - User data to update
   * @returns Updated user
   */
  static async updateUser(id: string, userData: UserUpdateData): Promise<Omit<User, 'password'>> {
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
      
      return user as Omit<User, 'password'>;
    } catch (error) {
      logger.error({
        message: 'Error updating user',
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new Error('Failed to update user');
    }
  }
  
  /**
   * Delete a user
   * 
   * @param id - User ID
   * @returns Success status
   */
  static async deleteUser(id: string): Promise<boolean> {
    try {
      // Soft delete by deactivating instead of permanently deleting
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
        message: 'Error deleting user',
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
      
      return false;
    }
  }
  
  /**
   * Verify user credentials
   * 
   * @param username - Username
   * @param password - Password
   * @returns User if credentials are valid, null otherwise
   */
  static async verifyCredentials(username: string, password: string): Promise<Omit<User, 'password'> | null> {
    try {
      // Get user
      const user = await EnhancedUserService.getUserByUsername(username);
      if (!user || !user.password || !user.isActive) return null;
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) return null;
      
      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error({
        message: 'Error verifying credentials',
        username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return null;
    }
  }
  
  /**
   * Create a password reset request
   * 
   * @param email - User email
   * @returns Success status and token
   */
  static async createPasswordResetRequest(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await EnhancedUserService.getUserByEmail(email);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'No active account found with that email',
        };
      }
      
      // Generate random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + EnhancedUserService.RESET_TOKEN_EXPIRY);
      
      // Save token to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: token,
          resetTokenExpiry: expiry,
        },
      });
      
      // Send reset email (implementation in emailUtils.ts)
      const resetUrl = `${process.env.APP_URL || 'http://localhost:6969'}/reset-password?token=${token}`;
      
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        text: `Please use the following link to reset your password: ${resetUrl}\nThis link will expire in 24 hours.`,
        html: `
          <p>Please use the following link to reset your password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link will expire in 24 hours.</p>
        `,
      });
      
      logger.info({
        message: 'Password reset request created',
        userId: user.id,
        email,
      });
      
      return {
        success: true,
        message: 'Password reset email sent',
      };
    } catch (error) {
      logger.error({
        message: 'Error creating password reset request',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        message: 'Failed to create password reset request',
      };
    }
  }
  
  /**
   * Reset password using token
   * 
   * @param token - Reset token
   * @param newPassword - New password
   * @returns Success status
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
          isActive: true,
        },
      });
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired token',
        };
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      
      logger.info({
        message: 'Password reset successfully',
        userId: user.id,
      });
      
      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      logger.error({
        message: 'Error resetting password',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        message: 'Failed to reset password',
      };
    }
  }
  
  /**
   * Change password
   * 
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Success status
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user || !user.password || !user.isActive) {
        return {
          success: false,
          message: 'User not found or inactive',
        };
      }
      
      // Verify current password
      const passwordValid = await bcrypt.compare(currentPassword, user.password);
      if (!passwordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }
      
      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      
      logger.info({
        message: 'Password changed successfully',
        userId,
      });
      
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      logger.error({
        message: 'Error changing password',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }
  
  /**
   * Create a session for a user
   * 
   * @param userId - User ID
   * @returns Session token
   */
  static async createSession(userId: string): Promise<string | null> {
    try {
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + EnhancedUserService.SESSION_EXPIRY);
      
      // Store session in cache (could also be stored in database)
      const sessionData = {
        userId,
        expiry,
      };
      
      CacheService.set(`session_${sessionToken}`, sessionData, EnhancedUserService.SESSION_EXPIRY / 1000);
      
      logger.info({
        message: 'Session created',
        userId,
      });
      
      return sessionToken;
    } catch (error) {
      logger.error({
        message: 'Error creating session',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return null;
    }
  }
  
  /**
   * Validate session
   * 
   * @param sessionToken - Session token
   * @returns User ID if session is valid, null otherwise
   */
  static async validateSession(sessionToken: string): Promise<string | null> {
    try {
      // Get session from cache
      const sessionData = CacheService.get<{ userId: string; expiry: Date }>(`session_${sessionToken}`);
      if (!sessionData) return null;
      
      // Check if session has expired
      if (new Date(sessionData.expiry) < new Date()) {
        CacheService.delete(`session_${sessionToken}`);
        return null;
      }
      
      // Get user and check if active
      const user = await EnhancedUserService.getUserById(sessionData.userId);
      if (!user || !user.isActive) {
        CacheService.delete(`session_${sessionToken}`);
        return null;
      }
      
      return sessionData.userId;
    } catch (error) {
      logger.error({
        message: 'Error validating session',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return null;
    }
  }
  
  /**
   * Invalidate session
   * 
   * @param sessionToken - Session token
   * @returns Success status
   */
  static invalidateSession(sessionToken: string): boolean {
    try {
      return CacheService.delete(`session_${sessionToken}`);
    } catch (error) {
      logger.error({
        message: 'Error invalidating session',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return false;
    }
  }
}
