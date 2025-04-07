import { Request, Response } from 'express';
import { z } from 'zod';
// Import UserService instead of EnhancedUserService
import { UserService } from '../services/userService';
import logger from '../utils/logger';

// Validation schema for updating users (admin)
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(), // Allow admin to reset password
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional(),
});

export class AdminUserController {
  static async getAllUsers(req: Request, res: Response): Promise<Response> {
    try {
      // Parse pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Parse filters
      const filters: any = {};
      if (req.query.username) filters.username = req.query.username as string;
      if (req.query.role) filters.role = req.query.role as string;
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }

      // Get users using UserService
      const { users, total } = await UserService.getAllUsers(page, limit, filters);

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.json({
        status: 'success',
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPrevPage,
          },
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting users (admin)',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting users',
      });
    }
  }

  static async getUserById(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.id;
      // Get user using UserService
      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      return res.json({
        status: 'success',
        data: {
          user,
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error getting user by ID (admin)',
        userId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while getting user',
      });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.id;

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

      // Check if user exists using UserService
      const userExists = await UserService.getUserById(userId);
      if (!userExists) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

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
        message: 'Admin updated user',
        adminId: req.user!.id, // req.user populated by authenticate middleware
        userId: userId,
      });

      return res.json({
        status: 'success',
        message: 'User updated successfully',
        data: {
          user,
        },
      });
    } catch (error) {
      logger.error({
        message: 'Error updating user (admin)',
        userId: req.params.id,
        adminId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while updating user',
      });
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.params.id;
      const adminId = req.user!.id;

      // Check if user exists using UserService
      const userExists = await UserService.getUserById(userId);
      if (!userExists) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      // Check if trying to delete self
      if (userId === adminId) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete your own account',
        });
      }

      // Determine if permanent delete
      const permanent = req.query.permanent === 'true';

      let success;
      if (permanent) {
        // Use UserService for permanent deletion
        success = await UserService.permanentlyDeleteUser(userId);
        logger.info({
          message: 'Admin permanently deleted user',
          adminId: adminId,
          userId: userId,
        });
      } else {
        // Use UserService for deactivation (soft delete)
        success = await UserService.deleteUser(userId); // Deactivate
        logger.info({
          message: 'Admin deactivated user',
          adminId: adminId,
          userId: userId,
        });
      }

      if (!success) {
        // The service layer logs the specific error, return a generic server error
        return res.status(500).json({
          status: 'error',
          message: 'Failed to delete user',
        });
      }

      return res.json({
        status: 'success',
        message: permanent ? 'User permanently deleted' : 'User deactivated',
      });
    } catch (error) {
      logger.error({
        message: 'Error deleting user (admin)',
        userId: req.params.id,
        adminId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while deleting user',
      });
    }
  }
}
