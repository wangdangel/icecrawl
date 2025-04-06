import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EnhancedUserService } from '../services/enhanced-user-service';
import { authenticate, requireAdmin, generateToken } from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  email: z.string().email().optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req: Request, res: Response) => {
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
    
    // Verify credentials
    const user = await EnhancedUserService.verifyCredentials(username, password);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
      });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Create session
    const sessionToken = await EnhancedUserService.createSession(user.id);
    
    logger.info({
      message: 'User logged in',
      userId: user.id,
      username: user.username,
    });
    
    // Return token and user info
    res.json({
      status: 'success',
      token,
      sessionToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Login error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login',
    });
  }
});

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: User registration
 *     description: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Username already exists
 */
router.post('/register', async (req: Request, res: Response) => {
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
    
    // Check if username exists
    const existingUser = await EnhancedUserService.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Username already exists',
      });
    }
    
    // Check if email exists (if provided)
    if (email) {
      const existingEmail = await EnhancedUserService.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already registered',
        });
      }
    }
    
    // Create user
    const user = await EnhancedUserService.createUser({
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
    res.status(201).json({
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
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during registration',
    });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the current authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    // Get user
    const user = await EnhancedUserService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    // Return user info
    res.json({
      status: 'success',
      user,
    });
  } catch (error) {
    logger.error({
      message: 'Error getting user profile',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting user information',
    });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user
 *     description: Updates the current authenticated user's information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */
router.put('/me', authenticate, async (req: Request, res: Response) => {
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
    
    // Remove role and isActive from regular user updates
    // These can only be changed by admins
    const { role, isActive, ...updateData } = parsedInput.data;
    
    // If username is being changed, check if it exists
    if (updateData.username) {
      const existingUser = await EnhancedUserService.getUserByUsername(updateData.username);
      if (existingUser && existingUser.id !== req.user!.id) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists',
        });
      }
    }
    
    // If email is being changed, check if it exists
    if (updateData.email) {
      const existingEmail = await EnhancedUserService.getUserByEmail(updateData.email);
      if (existingEmail && existingEmail.id !== req.user!.id) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already registered',
        });
      }
    }
    
    // Update user
    const user = await EnhancedUserService.updateUser(req.user!.id, updateData);
    
    logger.info({
      message: 'User updated profile',
      userId: req.user!.id,
    });
    
    res.json({
      status: 'success',
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    logger.error({
      message: 'Error updating user profile',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating user information',
    });
  }
});

/**
 * @swagger
 * /api/users/password:
 *   post:
 *     summary: Change password
 *     description: Change the authenticated user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Incorrect current password
 */
router.post('/password', authenticate, async (req: Request, res: Response) => {
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
    
    // Change password
    const result = await EnhancedUserService.changePassword(req.user!.id, currentPassword, newPassword);
    
    if (!result.success) {
      return res.status(401).json({
        status: 'error',
        message: result.message,
      });
    }
    
    logger.info({
      message: 'User changed password',
      userId: req.user!.id,
    });
    
    res.json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Error changing password',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while changing password',
    });
  }
});

/**
 * @swagger
 * /api/users/password/reset-request:
 *   post:
 *     summary: Request password reset
 *     description: Send a password reset email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Invalid input
 */
router.post('/password/reset-request', async (req: Request, res: Response) => {
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
    
    // Create password reset request
    const result = await EnhancedUserService.createPasswordResetRequest(email);
    
    // Always return success even if email doesn't exist (security)
    res.json({
      status: 'success',
      message: 'If a matching account was found, a password reset email has been sent',
    });
  } catch (error) {
    logger.error({
      message: 'Error creating password reset request',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating password reset request',
    });
  }
});

/**
 * @swagger
 * /api/users/password/reset:
 *   post:
 *     summary: Reset password
 *     description: Reset password using token from email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid or expired token
 */
router.post('/password/reset', async (req: Request, res: Response) => {
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
    
    // Reset password
    const result = await EnhancedUserService.resetPassword(token, newPassword);
    
    if (!result.success) {
      return res.status(401).json({
        status: 'error',
        message: result.message,
      });
    }
    
    res.json({
      status: 'success',
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Error resetting password',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while resetting password',
    });
  }
});

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout
 *     description: Invalidate the current session
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  try {
    // Get session token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Invalidate session
    EnhancedUserService.invalidateSession(token);
    
    logger.info({
      message: 'User logged out',
      userId: req.user!.id,
    });
    
    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Error logging out',
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while logging out',
    });
  }
});

// Admin-only routes
// ===========================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of users per page
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Filter by username
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
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
    
    // Get users
    const { users, total } = await EnhancedUserService.getAllUsers(page, limit, filters);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
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
      message: 'Error getting users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting users',
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Returns a user by ID (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get user
    const user = await EnhancedUserService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    res.json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error getting user by ID',
      userId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while getting user',
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Updates a user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
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
    
    // Check if user exists
    const userExists = await EnhancedUserService.getUserById(req.params.id);
    if (!userExists) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    // If username is being changed, check if it exists
    if (parsedInput.data.username) {
      const existingUser = await EnhancedUserService.getUserByUsername(parsedInput.data.username);
      if (existingUser && existingUser.id !== req.params.id) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists',
        });
      }
    }
    
    // If email is being changed, check if it exists
    if (parsedInput.data.email) {
      const existingEmail = await EnhancedUserService.getUserByEmail(parsedInput.data.email);
      if (existingEmail && existingEmail.id !== req.params.id) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already registered',
        });
      }
    }
    
    // Update user
    const user = await EnhancedUserService.updateUser(req.params.id, parsedInput.data);
    
    logger.info({
      message: 'Admin updated user',
      adminId: req.user!.id,
      userId: req.params.id,
    });
    
    res.json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Error updating user',
      userId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating user',
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Deletes a user (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *         description: Permanently delete the user
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Check if user exists
    const userExists = await EnhancedUserService.getUserById(req.params.id);
    if (!userExists) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    // Check if trying to delete self
    if (req.params.id === req.user!.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account',
      });
    }
    
    // Determine if permanent delete
    const permanent = req.query.permanent === 'true';
    
    let success;
    if (permanent) {
      success = await EnhancedUserService.permanentlyDeleteUser(req.params.id);
      
      logger.info({
        message: 'Admin permanently deleted user',
        adminId: req.user!.id,
        userId: req.params.id,
      });
    } else {
      success = await EnhancedUserService.deleteUser(req.params.id);
      
      logger.info({
        message: 'Admin deactivated user',
        adminId: req.user!.id,
        userId: req.params.id,
      });
    }
    
    if (!success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete user',
      });
    }
    
    res.json({
      status: 'success',
      message: permanent ? 'User permanently deleted' : 'User deactivated',
    });
  } catch (error) {
    logger.error({
      message: 'Error deleting user',
      userId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting user',
    });
  }
});

export default router;
