import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient
import { UserService } from '../services/userService.js';
import { generateToken, authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient(); // Instantiate PrismaClient
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags: [Authentication]
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
    const user = await UserService.verifyCredentials(username, password);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
      });
    }
    
    // Generate token
    const token = generateToken(user);
    
    logger.info({
      message: 'User logged in',
      userId: user.id,
      username: user.username,
    });
    
    // Return token and user info
    res.json({
      status: 'success',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
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
 * /auth/register:
 *   post:
 *     summary: User registration
 *     description: Register a new user
 *     tags: [Authentication]
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
    const existingUser = await UserService.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Username already exists',
      });
    }
    
    // Create user
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
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
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
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the current authenticated user
 *     tags: [Authentication]
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
    const user = await UserService.getUserById(req.user!.id);
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
      message: 'Error getting user',
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
 * /auth/users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of all users (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/users', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    // Return users
    res.json({
      status: 'success',
      users,
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

export default router;
