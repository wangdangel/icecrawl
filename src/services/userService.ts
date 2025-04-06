import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User service for managing users
 */
export class UserService {
  /**
   * Get a user by ID
   * 
   * @param id - User ID
   * @returns User or null if not found
   */
  static async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return user as Omit<User, 'password'> | null;
  }
  
  /**
   * Get a user by username
   * 
   * @param username - Username
   * @returns User or null if not found
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });
    
    return user as User | null;
  }
  
  /**
   * Create a new user
   * 
   * @param userData - User data
   * @returns Created user
   */
  static async createUser(userData: {
    username: string;
    password: string;
    role?: 'admin' | 'user';
    email?: string;
  }): Promise<Omit<User, 'password'>> {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        username: userData.username,
        password: hashedPassword,
        role: userData.role || 'user',
        email: userData.email,
      },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    logger.info({
      message: 'User created',
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    
    return user as Omit<User, 'password'>;
  }
  
  /**
   * Verify user credentials
   * 
   * @param username - Username
   * @param password - Password
   * @returns User if credentials are valid, null otherwise
   */
  static async verifyCredentials(username: string, password: string): Promise<Omit<User, 'password'> | null> {
    // Get user
    const user = await UserService.getUserByUsername(username);
    if (!user || !user.password) return null;
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) return null;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
