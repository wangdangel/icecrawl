import crypto from 'crypto';
import logger from '../utils/logger';
import { CacheService } from './cacheService';
import { UserService } from './userService'; // Need UserService to check if user is active

const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days (Consider making this configurable)

interface SessionData {
  userId: string;
  expiry: Date;
}

export class SessionService {
  /**
   * Create a session for a user
   *
   * @param userId - User ID
   * @returns Session token or null if creation fails
   */
  static async createSession(userId: string): Promise<string | null> {
    try {
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + SESSION_EXPIRY);

      // Store session in cache
      const sessionData: SessionData = {
        userId,
        expiry,
      };

      // Use SESSION_EXPIRY in seconds for CacheService TTL
      const success = CacheService.set(
        `session_${sessionToken}`,
        sessionData,
        SESSION_EXPIRY / 1000,
      );

      if (!success) {
        logger.error({ message: 'Failed to store session in cache', userId });
        return null;
      }

      logger.info({
        message: 'Session created',
        userId,
        // Avoid logging sessionToken for security
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
   * Validate session token
   *
   * @param sessionToken - Session token
   * @returns User ID if session is valid and user is active, null otherwise
   */
  static async validateSession(sessionToken: string): Promise<string | null> {
    try {
      // Get session from cache
      const sessionData = CacheService.get<SessionData>(`session_${sessionToken}`);
      if (!sessionData) {
        logger.debug({
          message: 'Session validation failed: Token not found in cache',
          token: sessionToken,
        });
        return null;
      }

      // Check if session has expired
      if (new Date(sessionData.expiry) < new Date()) {
        logger.debug({
          message: 'Session validation failed: Token expired',
          token: sessionToken,
          userId: sessionData.userId,
        });
        CacheService.delete(`session_${sessionToken}`); // Clean up expired token
        return null;
      }

      // Check if the associated user is still active
      const user = await UserService.getUserById(sessionData.userId);
      if (!user || !user.isActive) {
        logger.warn({
          message: 'Session validation failed: User not found or inactive',
          token: sessionToken,
          userId: sessionData.userId,
        });
        CacheService.delete(`session_${sessionToken}`); // Clean up token for inactive/deleted user
        return null;
      }

      // Session is valid
      logger.debug({
        message: 'Session validated successfully',
        token: sessionToken,
        userId: sessionData.userId,
      });
      return sessionData.userId;
    } catch (error) {
      logger.error({
        message: 'Error validating session',
        // Avoid logging sessionToken in case of error? Or mask it?
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Invalidate (delete) a session
   *
   * @param sessionToken - Session token
   * @returns Success status
   */
  static invalidateSession(sessionToken: string): boolean {
    try {
      const deleted = CacheService.delete(`session_${sessionToken}`);
      if (deleted) {
        logger.info({ message: 'Session invalidated successfully', token: sessionToken });
      } else {
        logger.warn({
          message: 'Attempted to invalidate non-existent session',
          token: sessionToken,
        });
      }
      return deleted;
    } catch (error) {
      logger.error({
        message: 'Error invalidating session',
        // Avoid logging sessionToken?
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
