import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
// Remove local PrismaClient import
import prisma from '../db/prismaClient'; // Import shared instance
import logger from '../utils/logger';
import { UserService, SafeUser, User } from './userService'; // Import UserService and types
import { sendEmail } from '../utils/email-utils';

// Remove local prisma instantiation
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Interface for JWT payload (adjust based on what you sign)
interface JwtPayload {
  id: string;
  username?: string;
  role: 'admin' | 'user' | 'api';
}

export class AuthService {
  /**
   * Generate a JWT token for a user
   *
   * @param user - User object (SafeUser or similar structure)
   * @returns JWT token
   */
  static generateToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }, // Consider making expiry configurable
    );
  }

  /**
   * Verify user credentials
   *
   * @param username - Username
   * @param password - Password
   * @returns SafeUser if credentials are valid, null otherwise
   */
  static async verifyCredentials(username: string, password: string): Promise<SafeUser | null> {
    try {
      // Get user (including password hash) using the internal method
      const user = await UserService.getUserByUsernameInternal(username);
      if (!user || !user.password || !user.isActive) {
        logger.warn({
          message: 'Credential verification failed: User not found or inactive',
          username,
        });
        return null;
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        logger.warn({ message: 'Credential verification failed: Invalid password', username });
        return null;
      }

      // Update last login time (fire and forget, don't await)
      UserService.updateLastLogin(user.id);

      // Return user without password and sensitive fields
      const { password: _, resetToken: __, resetTokenExpiry: ___, ...safeUser } = user;
      return safeUser;
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
   * Change password for an authenticated user
   *
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Success status and message
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user with password hash
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
        message: 'Failed to change password due to an internal error.',
      };
    }
  }

  /**
   * Create a password reset request
   *
   * @param email - User email
   * @returns Success status and message
   */
  static async createPasswordResetRequest(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email using the internal method
      const user = await UserService.getUserByEmailInternal(email);
      if (!user || !user.isActive) {
        // Log internally but return generic message externally for security
        logger.info({
          message: 'Password reset requested for non-existent or inactive email',
          email,
        });
        return {
          success: true, // Still return true externally
          message: 'If a matching account was found, a password reset email has been sent.',
        };
      }

      // Generate random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);

      // Save token to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: token,
          resetTokenExpiry: expiry,
        },
      });

      // Send reset email
      const resetUrl = `${process.env.APP_URL || 'http://localhost:6970'}/reset-password?token=${token}`; // Use correct default port

      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        text: `Please use the following link to reset your password: ${resetUrl}\nThis link will expire in 24 hours.`,
        html: `
          <p>You requested a password reset. Please use the following link to reset your password:</p>
          <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
          <p>This link will expire in 24 hours. If you did not request this, please ignore this email.</p>
        `,
      });

      logger.info({
        message: 'Password reset request created and email sent',
        userId: user.id,
        email,
      });

      return {
        success: true,
        message: 'If a matching account was found, a password reset email has been sent.',
      };
    } catch (error) {
      logger.error({
        message: 'Error creating password reset request',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return generic success message even on internal error for security
      return {
        success: true, // Still return true externally
        message: 'If a matching account was found, a password reset email has been sent.',
      };
    }
  }

  /**
   * Reset password using token
   *
   * @param token - Reset token
   * @param newPassword - New password
   * @returns Success status and message
   */
  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(), // Check if token is not expired
          },
          isActive: true,
        },
      });

      if (!user) {
        logger.warn({ message: 'Password reset attempt with invalid or expired token', token });
        return {
          success: false,
          message: 'Invalid or expired password reset token.',
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

      // Optionally send a confirmation email
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: 'Your Password Has Been Reset',
          text: 'Your password for the Web Scraper application has been successfully reset. If you did not perform this action, please contact support immediately.',
          html: '<p>Your password for the Web Scraper application has been successfully reset. If you did not perform this action, please contact support immediately.</p>',
        }).catch(err =>
          logger.error({
            message: 'Failed to send password reset confirmation email',
            userId: user.id,
            error: err,
          }),
        );
      }

      return {
        success: true,
        message: 'Password reset successfully.',
      };
    } catch (error) {
      logger.error({
        message: 'Error resetting password',
        tokenUsed: token ? 'yes' : 'no', // Avoid logging the token itself
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'Failed to reset password due to an internal error.',
      };
    }
  }
}
