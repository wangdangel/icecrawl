import { Router, Request, Response } from 'express'; // Added Request, Response back
import { z } from 'zod';
// Remove unused import for the deleted service
// import { EnhancedUserService } from '../services/enhanced-user-service';
import { authenticate, requireAdmin } from '../middleware/authMiddleware'; // Removed generateToken
import logger from '../utils/logger';
import { UserController } from '../controllers/userController'; // Import the controller
import { AdminUserController } from '../controllers/adminUserController'; // Import the admin controller

const router = Router();

// --- Authentication routes moved to src/routes/authRoutes.ts ---

// --- Current User Profile Routes ---

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the profile information for the currently authenticated user.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, UserController.getCurrentUser); // Use the controller method

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     description: Updates the profile information for the currently authenticated user. Allows updating username, password, and email.
 *     tags: [Profile]
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
router.put('/me', authenticate, UserController.updateCurrentUser); // Use the controller method

/**
 * @swagger
 * /api/users/me/password:
 *   post:
 *     summary: Change current user password
 *     description: Allows the currently authenticated user to change their password by providing the current and new password.
 *     tags: [Profile]
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
router.post('/me/password', authenticate, UserController.changePassword); // Use the controller method, updated path

// --- Admin User Management Routes ---

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin)
 *     description: Returns a paginated list of all users. Requires admin privileges.
 *     tags: [Admin - Users]
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
router.get('/', authenticate, requireAdmin, AdminUserController.getAllUsers); // Use the controller method

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin)
 *     description: Returns details for a specific user by their ID. Requires admin privileges.
 *     tags: [Admin - Users]
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
router.get('/:id', authenticate, requireAdmin, AdminUserController.getUserById); // Use the controller method

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin)
 *     description: Updates details for a specific user. Allows updating username, password, email, role, and active status. Requires admin privileges.
 *     tags: [Admin - Users]
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
router.put('/:id', authenticate, requireAdmin, AdminUserController.updateUser); // Use the controller method

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin)
 *     description: Deactivates or permanently deletes a user. Requires admin privileges. Use `?permanent=true` for permanent deletion.
 *     tags: [Admin - Users]
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
router.delete('/:id', authenticate, requireAdmin, AdminUserController.deleteUser); // Use the controller method

export default router;
