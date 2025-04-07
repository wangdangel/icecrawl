import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
// Import AuthService to potentially verify token structure if needed, or just rely on jwt.verify
// import { AuthService } from '../services/authService'; // Not strictly needed if just verifying

// Get secret key from environment variable or use default (for development only)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * User interface for authentication payload within the token
 */
export interface User {
  id: string;
  username?: string; // Make username optional for API key auth
  role: 'admin' | 'user' | 'api'; // Add 'api' role
}

// Add user property to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User; // Keep this declaration for augmenting Request
    }
  }
}

// REMOVED generateToken - Moved to AuthService

/**
 * Middleware to verify JWT authentication
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }
    
    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    
    // Add user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.warn({
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      status: 'error',
      message: 'Admin access required',
    });
    return; // Exit after sending response
  }
  
  next();
}
