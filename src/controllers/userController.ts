import { Request, Response } from 'express';
import { z } from 'zod';
// Import new services
import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { SessionService } from '../services/sessionService';
// Remove EnhancedUserService import
// Remove generateToken import (now in AuthService)
import prisma from '../db/prismaClient'; // Import shared instance
import type { Prisma, User } from '@prisma/client';
import logger from '../utils/logger';

// Validation schema for login
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Validation schema for registration
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  email: z.string().email().optional(),
});

// Validation schema for user update
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  email: z.string().email().optional(),
  // role and isActive are intentionally omitted - handled by admin controller/routes
});

// Validation schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// Validation schema for password reset request
const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

// Validation schema for password reset
const passwordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export class UserController {
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      // Validate input
      const parsedInput = loginSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          details: parsedInput.error.format(),
        });
      }

      const { username, password } = parsedInput.data;

      // Verify credentials using AuthService
      const user = await AuthService.verifyCredentials(username, password);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password',
        });
      }

      // Generate token using AuthService
      const token = AuthService.generateToken(user);

      // Create session using SessionService
      const sessionToken = await SessionService.createSession(user.id);

      logger.info({
        message: 'User logged in',
        userId: user.id,
        username: user.username,
      });

      // Return token and user info
      return res.json({
        status: 'success',
        token,
        sessionToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email, // Assuming email is available on the user object returned by verifyCredentials
        },
      });
    } catch (error) {
      logger.error({
        message: 'Login error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred during login',
      });
    }
  }

  static async register(req: Request, res: Response): Promise<Response> {
    try {
      // Validate input
      const parsedInput = registerSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          details: parsedInput.error.format(),
        });
      }

      const { username, password, email } = parsedInput.data;

      // Check if username exists using UserService internal method
      const existingUser = await UserService.getUserByUsernameInternal(username);
      if (existingUser) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists',
        });
      }

      // Check if email exists (if provided) using UserService internal method
      if (email) {
        const existingEmail = await UserService.getUserByEmailInternal(email);
        if (existingEmail) {
          return res.status(409).json({
            status: 'error',
            message: 'Email already registered',
          });
        }
      }

      // Create user using UserService
      const user = await UserService.createUser({
        username,
        password,
        email,
      });

      logger.info({
        message: 'User registered',
        userId: user.id,
        username: user.username,
      });

      // Return user info
      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error({
        message: 'Registration error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred during registration',
      });
    }
  }

  static async getCurrentUser(req: Request, res: Response): Promise<Response> {
    try {
      // req.user is populated by the authenticate middleware
      // Get user using UserService
      const user = await UserService.getUserById(req.user!.id);
      if (!user) {
        // This case should ideally not happen if the token is valid
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      // Return user info (excluding password)
      return res.json({
        status: 'success',
        user, // getUserById already returns the user without password
      });
    } catch (error) {
      logger.error({
        message: 'Error getting user profile',
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting user information',
      });
    }
  }

  static async updateCurrentUser(req: Request, res: Response): Promise<Response> {
    try {
      // Validate input
      const parsedInput = updateUserSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          details: parsedInput.error.format(),
        });
      }

      const updateData = parsedInput.data;
      const userId = req.user!.id;

      // If username is being changed, check if it exists for another user using UserService internal method
      if (updateData.username) {
        const existingUser = await UserService.getUserByUsernameInternal(updateData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            status: 'error',
            message: 'Username already exists',
          });
        }
      }

      // If email is being changed, check if it exists for another user using UserService internal method
      if (updateData.email) {
        const existingEmail = await UserService.getUserByEmailInternal(updateData.email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(409).json({
            status: 'error',
            message: 'Email already registered',
          });
        }
      }

      // Update user using UserService
      const user = await UserService.updateUser(userId, updateData);

      logger.info({
        message: 'User updated profile',
        userId: userId,
      });

      return res.json({
        status: 'success',
        message: 'User updated successfully',
        user, // updateUser returns the updated user without password
      });
    } catch (error) {
      logger.error({
        message: 'Error updating user profile',
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while updating user information',
      });
    }
  }

  static async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      // Validate input
      const parsedInput = passwordChangeSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          details: parsedInput.error.format(),
        });
      }

      const { currentPassword, newPassword } = parsedInput.data;
      const userId = req.user!.id;

      // Change password using AuthService
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      if (!result.success) {
        return res.status(401).json({
          // Use 401 for incorrect current password
          status: 'error',
          message: result.message,
        });
      }

      logger.info({
        message: 'User changed password',
        userId: userId,
      });

      return res.json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Error changing password',
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while changing password',
      });
    }
  }

  static async requestPasswordReset(req: Request, res: Response): Promise<Response> {
    try {
      // Validate input
      const parsedInput = passwordResetRequestSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          details: parsedInput.error.format(),
        });
      }

      const { email } = parsedInput.data;

      // Create password reset request using AuthService
      await AuthService.createPasswordResetRequest(email);

      // Always return success even if email doesn't exist (security)
      return res.json({
        status: 'success',
        message: 'If a matching account was found, a password reset email has been sent',
      });
    } catch (error) {
      logger.error({
        message: 'Error creating password reset request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while creating password reset request',
      });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      // Validate input
      const parsedInput = passwordResetSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          details: parsedInput.error.format(),
        });
      }

      const { token, newPassword } = parsedInput.data;

      // Reset password using AuthService
      const result = await AuthService.resetPassword(token, newPassword);

      if (!result.success) {
        return res.status(401).json({
          // Use 401 for invalid/expired token
          status: 'error',
          message: result.message,
        });
      }

      return res.json({
        status: 'success',
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Error resetting password',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while resetting password',
      });
    }
  }

  static logout(req: Request, res: Response): Response {
    try {
      // Get session token from header (assuming JWT is used for session token here)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // If no token, maybe the session is already invalid or wasn't established
        return res.status(401).json({
          status: 'error',
          message: 'Not authenticated or session token missing',
        });
      }

      const token = authHeader.split(' ')[1];

      // Invalidate session using SessionService
      const invalidated = SessionService.invalidateSession(token);

      if (invalidated) {
        logger.info({
          message: 'User logged out',
          userId: req.user!.id, // req.user should be populated by 'authenticate' middleware
        });
        return res.json({
          status: 'success',
          message: 'Logged out successfully',
        });
      } else {
        // This might happen if the token was already invalid or couldn't be deleted
        logger.warn({
          message: 'Logout attempt with invalid or already invalidated token',
          userId: req.user?.id, // Use optional chaining as req.user might not be set if token was bad
        });
        return res.status(400).json({
          status: 'error',
          message: 'Failed to invalidate session or session already invalid',
        });
      }
    } catch (error) {
      logger.error({
        message: 'Error logging out',
        userId: req.user?.id, // Use optional chaining
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while logging out',
      });
    }
  }

  // Other controller methods will be added here...
}
