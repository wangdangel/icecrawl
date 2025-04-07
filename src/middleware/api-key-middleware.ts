import { Request, Response, NextFunction } from 'express';
// Import the ApiKey interface from the service where it's defined
import { ApiKeyService, ApiKey } from '../services/api-key-service'; 
import logger from '../utils/logger';

/**
 * Middleware to authenticate requests using API key
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      res.status(401).json({
        status: 'error',
        message: 'API key is required',
      });
      return; // Exit after sending response
    }
    
    // Validate API key and add to request
    validateAndProcessApiKey(apiKey, req, res, next);
  } catch (error) {
    logger.error({
      message: 'API key authentication error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Middleware to authenticate requests using either API key or JWT
 * Falls back to JWT auth if API key is not provided
 */
export function authenticateApiKeyOrJwt(authJwt: (req: Request, res: Response, next: NextFunction) => void) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get API key from header
      const apiKey = req.headers['x-api-key'] as string;
      
      // If API key is provided, validate it
      if (apiKey) {
        validateAndProcessApiKey(apiKey, req, res, next);
      } else {
        // Otherwise, use JWT authentication
        authJwt(req, res, next);
      }
    } catch (error) {
      logger.error({
        message: 'Authentication error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      res.status(500).json({
        status: 'error',
        message: 'An error occurred during authentication',
      });
    }
  };
}

/**
 * Check if API key has required permission
 * 
 * @param permission - Required permission
 */
export function requireApiKeyPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if not authenticated with API key
    if (!req.apiKey) {
      return next();
    }
    
    // Check permission
    if (!ApiKeyService.hasPermission(req.apiKey, permission)) {
      res.status(403).json({
        status: 'error',
        message: 'API key does not have required permission',
      });
      return; // Exit after sending response
    }
    
    next();
  };
}

/**
 * Helper function to validate API key and add to request
 */
async function validateAndProcessApiKey(apiKey: string, req: Request, res: Response, next: NextFunction): Promise<void> {
  // Validate API key
  const validApiKey = await ApiKeyService.validateApiKey(apiKey);
  
  if (!validApiKey) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid or inactive API key',
    });
    return; // Exit after sending response
  }
  
  // Add API key to request
  req.apiKey = validApiKey;
  
  // Get user ID from API key
  req.user = {
    id: validApiKey.userId,
    role: 'api', // Special role for API key authentication
  };
  
  next();
}

// Add API key property to Express Request
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey; // Use the imported ApiKey type
    }
  }
}
