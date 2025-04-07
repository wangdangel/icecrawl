// Remove local PrismaClient import
import prisma from '../db/prismaClient'; // Import shared instance
import crypto from 'crypto';
import logger from '../utils/logger';

// Remove local prisma instantiation

/**
 * API Key interface
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  permissions: string;
}

/**
 * API Key creation data interface
 */
export interface ApiKeyCreateData {
  name: string;
  userId: string;
  permissions?: string[];
}

/**
 * API Key service for managing API keys
 */
export class ApiKeyService {
  /**
   * Generate a new API key
   * 
   * @returns Cryptographically secure API key
   */
  private static generateKey(): string {
    // Generate 32 random bytes and encode as base64
    const buffer = crypto.randomBytes(32);
    return buffer.toString('base64').replace(/[+/=]/g, '')
      .substring(0, 32); // Trim to 32 characters
  }
  
  /**
   * Create a new API key
   * 
   * @param data - API key creation data
   * @returns Created API key
   */
  static async createApiKey(data: ApiKeyCreateData): Promise<ApiKey> {
    try {
      // Generate key
      const key = this.generateKey();
      
      // Format permissions
      const permissions = data.permissions ? JSON.stringify(data.permissions) : JSON.stringify(['read']);
      
      // Create API key in database
      const apiKey = await prisma.apiKey.create({
        data: {
          name: data.name,
          key,
          userId: data.userId,
          permissions,
          isActive: true,
        }
      });
      
      logger.info({
        message: 'API key created',
        keyId: apiKey.id,
        userId: apiKey.userId,
      });
      
      return apiKey as ApiKey;
    } catch (error) {
      logger.error({
        message: 'Error creating API key',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });
      
      throw new Error('Failed to create API key');
    }
  }
  
  /**
   * Validate an API key
   * 
   * @param key - API key to validate
   * @returns API key data if valid, null otherwise
   */
  static async validateApiKey(key: string): Promise<ApiKey | null> {
    try {
      // Find API key
      const apiKey = await prisma.apiKey.findUnique({
        where: { key },
      });
      
      if (!apiKey || !apiKey.isActive) {
        return null;
      }
      
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      });
      
      return apiKey as ApiKey;
    } catch (error) {
      logger.error({
        message: 'Error validating API key',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return null;
    }
  }
  
  /**
   * Get API keys for a user
   * 
   * @param userId - User ID
   * @returns Array of API keys
   */
  static async getApiKeysForUser(userId: string): Promise<ApiKey[]> {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      
      return apiKeys as ApiKey[];
    } catch (error) {
      logger.error({
        message: 'Error getting API keys for user',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      
      return [];
    }
  }
  
  /**
   * Revoke an API key
   * 
   * @param id - API key ID
   * @param userId - User ID (for security check)
   * @returns Success status
   */
  static async revokeApiKey(id: string, userId: string): Promise<boolean> {
    try {
      // Find API key and check ownership
      const apiKey = await prisma.apiKey.findUnique({
        where: { id },
      });
      
      if (!apiKey || apiKey.userId !== userId) {
        return false;
      }
      
      // Deactivate API key
      await prisma.apiKey.update({
        where: { id },
        data: { isActive: false },
      });
      
      logger.info({
        message: 'API key revoked',
        keyId: id,
        userId,
      });
      
      return true;
    } catch (error) {
      logger.error({
        message: 'Error revoking API key',
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId: id,
        userId,
      });
      
      return false;
    }
  }
  
  /**
   * Delete an API key permanently
   * 
   * @param id - API key ID
   * @param userId - User ID (for security check)
   * @returns Success status
   */
  static async deleteApiKey(id: string, userId: string): Promise<boolean> {
    try {
      // Find API key and check ownership
      const apiKey = await prisma.apiKey.findUnique({
        where: { id },
      });
      
      if (!apiKey || apiKey.userId !== userId) {
        return false;
      }
      
      // Delete API key
      await prisma.apiKey.delete({
        where: { id },
      });
      
      logger.info({
        message: 'API key deleted',
        keyId: id,
        userId,
      });
      
      return true;
    } catch (error) {
      logger.error({
        message: 'Error deleting API key',
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId: id,
        userId,
      });
      
      return false;
    }
  }
  
  /**
   * Check if a user has permission to perform an action
   * 
   * @param key - API key
   * @param requiredPermission - Permission required
   * @returns True if user has permission, false otherwise
   */
  static hasPermission(apiKey: ApiKey, requiredPermission: string): boolean {
    try {
      // Parse permissions
      const permissions = JSON.parse(apiKey.permissions);
      
      // Check if user has permission
      return permissions.includes(requiredPermission) || permissions.includes('admin');
    } catch (error) {
      logger.error({
        message: 'Error checking API key permissions',
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId: apiKey.id,
      });
      
      return false;
    }
  }
}
