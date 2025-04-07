import bcrypt from 'bcrypt';
import { UserService, User, SafeUser, UserCreateData, UserUpdateData } from '../userService';
import prisma from '../../db/prismaClient'; // Import the actual prisma client path
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../db/prismaClient', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Type assertion for mocked functions
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
// prisma is already mocked, access methods directly
const mockedPrismaUser = prisma.user as jest.Mocked<typeof prisma.user>;

describe('UserService', () => {
  const mockDate = new Date();
  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user',
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    lastLogin: undefined, // Corrected: Use undefined for optional Date fields
    resetToken: null, // Use null for optional string fields
    resetTokenExpiry: null, // Use null for optional Date fields
  };
  // SafeUser structure matches the select in getUserById, getAllUsers, createUser, updateUser
  const safeUser: SafeUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    lastLogin: undefined, // Corrected: Use undefined for optional Date fields
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- getUserById ---
  describe('getUserById', () => {
    it('should return SafeUser if user is found', async () => {
      // Mock should resolve with the structure defined by the 'select' clause
      (mockedPrismaUser.findUnique as jest.Mock).mockResolvedValue(safeUser); 
      const result = await UserService.getUserById('user-1');
      expect(result).toEqual(safeUser);
      expect(mockedPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object), // Check that select is used
      });
    });

    it('should return null if user is not found', async () => {
      (mockedPrismaUser.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await UserService.getUserById('not-found');
      expect(result).toBeNull();
    });

    it('should return null and log error on exception', async () => {
      const error = new Error('DB Error');
      (mockedPrismaUser.findUnique as jest.Mock).mockRejectedValue(error);
      const result = await UserService.getUserById('user-1');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error getting user by ID' }));
    });
  });

  // --- getUserByUsernameInternal ---
  describe('getUserByUsernameInternal', () => {
    it('should return full User if user is found', async () => {
      // This method doesn't use select, so resolve with the full mockUser
      (mockedPrismaUser.findUnique as jest.Mock).mockResolvedValue(mockUser); 
      const result = await UserService.getUserByUsernameInternal('testuser');
      expect(result).toEqual(mockUser);
      expect(mockedPrismaUser.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    });

    it('should return null if user is not found', async () => {
      (mockedPrismaUser.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await UserService.getUserByUsernameInternal('not-found');
      expect(result).toBeNull();
    });
    
    it('should return null and log error on exception', async () => {
      const error = new Error('DB Error');
      (mockedPrismaUser.findUnique as jest.Mock).mockRejectedValue(error);
      const result = await UserService.getUserByUsernameInternal('testuser');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error getting internal user by username' }));
    });
  });
  
   // --- getUserByEmailInternal ---
  describe('getUserByEmailInternal', () => {
    it('should return full User if user is found by email', async () => {
      // This method doesn't use select, so resolve with the full mockUser
      (mockedPrismaUser.findFirst as jest.Mock).mockResolvedValue(mockUser); 
      const result = await UserService.getUserByEmailInternal('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockedPrismaUser.findFirst).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null if user is not found by email', async () => {
      (mockedPrismaUser.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await UserService.getUserByEmailInternal('not-found@example.com');
      expect(result).toBeNull();
    });
    
    it('should return null and log error on exception', async () => {
      const error = new Error('DB Error');
      (mockedPrismaUser.findFirst as jest.Mock).mockRejectedValue(error);
      const result = await UserService.getUserByEmailInternal('test@example.com');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error getting internal user by email' }));
    });
  });

  // --- getAllUsers ---
  describe('getAllUsers', () => {
     it('should return users and total count without filters', async () => {
        const usersResult = [safeUser, { ...safeUser, id: 'user-2', username: 'testuser2' }];
        // Mock findMany to return the SafeUser structure due to 'select'
        (mockedPrismaUser.findMany as jest.Mock).mockResolvedValue(usersResult); 
        (mockedPrismaUser.count as jest.Mock).mockResolvedValue(2);

        const result = await UserService.getAllUsers(1, 10);

        expect(result.users).toEqual(usersResult);
        expect(result.total).toBe(2);
        expect(mockedPrismaUser.findMany).toHaveBeenCalledWith({
            where: {},
            select: expect.any(Object),
            skip: 0,
            take: 10,
            orderBy: { createdAt: 'desc' },
        });
        expect(mockedPrismaUser.count).toHaveBeenCalledWith({ where: {} });
    });
    
    it('should apply filters correctly', async () => {
        // Mock findMany to return the SafeUser structure
        (mockedPrismaUser.findMany as jest.Mock).mockResolvedValue([safeUser]); 
        (mockedPrismaUser.count as jest.Mock).mockResolvedValue(1);
        const filters = { username: 'test', role: 'user', isActive: true };

        await UserService.getAllUsers(1, 5, filters);

        const expectedWhere = {
            username: { contains: 'test', mode: 'insensitive' },
            role: 'user',
            isActive: true,
        };
        expect(mockedPrismaUser.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expectedWhere,
            skip: 0,
            take: 5,
        }));
        expect(mockedPrismaUser.count).toHaveBeenCalledWith({ where: expectedWhere });
    });
    
     it('should handle pagination correctly', async () => {
        (mockedPrismaUser.findMany as jest.Mock).mockResolvedValue([]);
        (mockedPrismaUser.count as jest.Mock).mockResolvedValue(15); // Assume 15 total users

        await UserService.getAllUsers(2, 5); // Request page 2 with 5 items per page

        expect(mockedPrismaUser.findMany).toHaveBeenCalledWith(expect.objectContaining({
            skip: 5, // (2 - 1) * 5
            take: 5,
        }));
    });
    
    it('should return empty array and 0 total on error', async () => {
        const error = new Error('DB Error');
        (mockedPrismaUser.findMany as jest.Mock).mockRejectedValue(error);
        // No need to mock count if findMany fails first, but good practice
        (mockedPrismaUser.count as jest.Mock).mockResolvedValue(0); 

        const result = await UserService.getAllUsers();

        expect(result).toEqual({ users: [], total: 0 });
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error getting all users' }));
    });
  });

  // --- createUser ---
  describe('createUser', () => {
    const createData: UserCreateData = { username: 'newuser', password: 'password', email: 'new@example.com' };
    const hashedPassword = 'hashedNewPassword';
    // Mock the return value based on the 'select' clause (SafeUser structure)
    const createdSafeUser = { ...safeUser, id: 'new-id', username: createData.username, email: createData.email }; 

     it('should create user, hash password, and return SafeUser', async () => {
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword as never);
        (mockedPrismaUser.create as jest.Mock).mockResolvedValue(createdSafeUser);

        const result = await UserService.createUser(createData);

        expect(result).toEqual(createdSafeUser);
        expect(mockedBcrypt.hash).toHaveBeenCalledWith(createData.password, 10);
        expect(mockedPrismaUser.create).toHaveBeenCalledWith({
            data: {
                username: createData.username,
                password: hashedPassword,
                role: 'user', // Default role
                email: createData.email,
                isActive: true, // Default active
            },
            select: expect.any(Object),
        });
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'User created' }));
    });
    
    it('should throw specific error for username conflict', async () => {
        const error = new Error('Unique constraint failed') as any;
        error.code = 'P2002';
        error.meta = { target: ['username'] };
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword as never);
        (mockedPrismaUser.create as jest.Mock).mockRejectedValue(error);

        await expect(UserService.createUser(createData)).rejects.toThrow(`Username '${createData.username}' already exists.`);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error creating user' }));
    });
    
     it('should throw specific error for email conflict', async () => {
        const error = new Error('Unique constraint failed') as any;
        error.code = 'P2002';
        error.meta = { target: ['email'] };
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword as never);
        (mockedPrismaUser.create as jest.Mock).mockRejectedValue(error);

        await expect(UserService.createUser(createData)).rejects.toThrow(`Email '${createData.email}' already registered.`);
         expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error creating user' }));
    });
    
     it('should throw generic error for other exceptions', async () => {
        const error = new Error('DB connection failed');
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword as never);
        (mockedPrismaUser.create as jest.Mock).mockRejectedValue(error);

        await expect(UserService.createUser(createData)).rejects.toThrow('Failed to create user');
         expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error creating user' }));
    });
  });

  // --- updateUser ---
  describe('updateUser', () => {
     const updateData: UserUpdateData = { username: 'updateduser', email: 'updated@example.com', isActive: false };
     // Mock the return value based on the 'select' clause (SafeUser structure)
     const updatedSafeUser = { ...safeUser, ...updateData }; 

     it('should update user data and return SafeUser', async () => {
        (mockedPrismaUser.update as jest.Mock).mockResolvedValue(updatedSafeUser);

        const result = await UserService.updateUser('user-1', updateData);

        expect(result).toEqual(updatedSafeUser);
        expect(mockedPrismaUser.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: updateData, // Password not included, so no hashing
            select: expect.any(Object),
        });
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'User updated' }));
        expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });
    
     it('should hash password if provided in update data', async () => {
        const updateWithPassword: UserUpdateData = { ...updateData, password: 'newPassword' };
        const hashedPassword = 'hashedNewPassword';
        // Mock the return value based on the 'select' clause (SafeUser structure)
        const updatedSafeUserResult = { ...safeUser, ...updateData }; 
        (mockedPrismaUser.update as jest.Mock).mockResolvedValue(updatedSafeUserResult); 
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword as never);

        await UserService.updateUser('user-1', updateWithPassword);

        expect(mockedBcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
        expect(mockedPrismaUser.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { ...updateData, password: hashedPassword }, // Hashed password included
            select: expect.any(Object),
        });
    });
    
    // Add tests for unique constraint errors on update (similar to create)
     it('should throw specific error for username conflict on update', async () => {
        const error = new Error('Unique constraint failed') as any;
        error.code = 'P2002';
        error.meta = { target: ['username'] };
        (mockedPrismaUser.update as jest.Mock).mockRejectedValue(error);

        await expect(UserService.updateUser('user-1', updateData)).rejects.toThrow(`Username '${updateData.username}' already exists.`);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error updating user' }));
    });
    
     it('should throw generic error for other exceptions on update', async () => {
        const error = new Error('DB connection failed');
        (mockedPrismaUser.update as jest.Mock).mockRejectedValue(error);

        await expect(UserService.updateUser('user-1', updateData)).rejects.toThrow('Failed to update user');
         expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error updating user' }));
    });
  });

  // --- deleteUser ---
  describe('deleteUser', () => {
     it('should deactivate user (set isActive to false)', async () => {
        // Update doesn't return the user in the service, so mock can be simple
        (mockedPrismaUser.update as jest.Mock).mockResolvedValue({}); 

        const result = await UserService.deleteUser('user-1');

        expect(result).toBe(true);
        expect(mockedPrismaUser.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { isActive: false },
        });
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'User deactivated' }));
    });
    
     it('should return false and log error on exception', async () => {
        const error = new Error('DB Error');
        (mockedPrismaUser.update as jest.Mock).mockRejectedValue(error);

        const result = await UserService.deleteUser('user-1');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error deactivating user' }));
    });
  });

  // --- permanentlyDeleteUser ---
  describe('permanentlyDeleteUser', () => {
     it('should permanently delete user', async () => {
        // Delete doesn't return the user in the service, so mock can be simple
        (mockedPrismaUser.delete as jest.Mock).mockResolvedValue({}); 

        const result = await UserService.permanentlyDeleteUser('user-1');

        expect(result).toBe(true);
        expect(mockedPrismaUser.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'User permanently deleted' }));
    });
    
     it('should return false if user not found (P2025 error)', async () => {
        const error = new Error('Record to delete does not exist.') as any;
        error.code = 'P2025';
        (mockedPrismaUser.delete as jest.Mock).mockRejectedValue(error);

        const result = await UserService.permanentlyDeleteUser('user-1');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error permanently deleting user' }));
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Attempted to permanently delete non-existent user'));
    });
    
     it('should return false and log error for other exceptions', async () => {
        const error = new Error('DB connection error');
        (mockedPrismaUser.delete as jest.Mock).mockRejectedValue(error);

        const result = await UserService.permanentlyDeleteUser('user-1');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error permanently deleting user' }));
        expect(logger.warn).not.toHaveBeenCalled(); // Should not log the P2025 warning
    });
  });

  // --- updateLastLogin ---
  describe('updateLastLogin', () => {
     it('should update lastLogin time', async () => {
        // Update doesn't return the user in the service, so mock can be simple
        (mockedPrismaUser.update as jest.Mock).mockResolvedValue({}); 

        await UserService.updateLastLogin('user-1');

        expect(mockedPrismaUser.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { lastLogin: expect.any(Date) },
        });
        expect(logger.error).not.toHaveBeenCalled(); // Expect no error log
    });
    
     it('should log error but not throw on exception', async () => {
        const error = new Error('DB Error');
        (mockedPrismaUser.update as jest.Mock).mockRejectedValue(error);

        await UserService.updateLastLogin('user-1'); // Should not throw

        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Failed to update last login time' }));
    });
  });
});
