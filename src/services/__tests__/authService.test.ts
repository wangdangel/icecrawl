import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthService } from '../authService';
import { UserService, SafeUser, User } from '../userService';
import prisma from '../../db/prismaClient'; // Import the actual prisma client path
import { sendEmail } from '../../utils/email-utils';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('../userService');
jest.mock('../../db/prismaClient', () => ({
  // Mock the shared prisma instance
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('../../utils/email-utils');
jest.mock('../../utils/logger', () => ({
  // Mock logger to suppress output during tests
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Type assertion for mocked functions
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
// Keep jwt import, but cast specific methods when needed
const mockedUserService = UserService as jest.Mocked<typeof UserService>;
// prisma is already mocked via jest.mock, no need for jest.Mocked assertion here
const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('AuthService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // --- Test cases will go here ---

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload and sign options', () => {
      const user: Pick<User, 'id' | 'username' | 'role'> = {
        id: 'user-123',
        username: 'testuser',
        role: 'user',
      };
      const expectedToken = 'mocked.jwt.token';
      // Cast jwt.sign to jest.Mock when setting return value
      (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

      const token = AuthService.generateToken(user);

      expect(token).toBe(expectedToken);
      // Cast jwt.sign to jest.Mock for assertion
      expect(jwt.sign as jest.Mock).toHaveBeenCalledWith(
        { id: user.id, username: user.username, role: user.role }, // Payload
        process.env.JWT_SECRET || 'your-secret-key-change-this-in-production', // Secret
        { expiresIn: '24h' }, // Options
      );
    });
  });

  describe('verifyCredentials', () => {
    const username = 'testuser';
    const password = 'password123';
    const hashedPassword = 'hashedPassword';
    const mockUser: User = {
      id: 'user-123',
      username: username,
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined, // Use undefined to match 'Date | undefined'
      resetToken: undefined, // Use undefined to match 'string | undefined'
      resetTokenExpiry: undefined, // Use undefined to match 'Date | undefined'
    };
    // Exclude fields not in SafeUser
    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = mockUser;

    it('should return SafeUser if credentials are valid', async () => {
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(mockUser);
      // Explicitly type the mock resolution
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      const result = await AuthService.verifyCredentials(username, password);

      expect(result).toEqual(safeUser);
      expect(mockedUserService.getUserByUsernameInternal).toHaveBeenCalledWith(username);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockedUserService.updateLastLogin).toHaveBeenCalledWith(mockUser.id); // Corrected variable name
    });

    it('should return null if user is not found', async () => {
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null);

      const result = await AuthService.verifyCredentials(username, password);

      expect(result).toBeNull();
      expect(mockedUserService.getUserByUsernameInternal).toHaveBeenCalledWith(username);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedUserService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should return null if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(inactiveUser);

      const result = await AuthService.verifyCredentials(username, password);

      expect(result).toBeNull();
      expect(mockedUserService.getUserByUsernameInternal).toHaveBeenCalledWith(username);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedUserService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(mockUser);
      // Explicitly type the mock resolution
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false as never); // Password doesn't match

      const result = await AuthService.verifyCredentials(username, password);

      expect(result).toBeNull();
      expect(mockedUserService.getUserByUsernameInternal).toHaveBeenCalledWith(username);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockedUserService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should return null and log error if an exception occurs', async () => {
      const error = new Error('Database error');
      mockedUserService.getUserByUsernameInternal.mockRejectedValue(error);

      const result = await AuthService.verifyCredentials(username, password);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error verifying credentials',
          username,
          error: error.message,
        }),
      );
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedUserService.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const currentPassword = 'oldPassword';
    const newPassword = 'newPassword';
    const hashedPassword = 'hashedOldPassword';
    const newHashedPassword = 'hashedNewPassword';
    const mockUser: User = {
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    };

    it('should change password successfully if current password is correct', async () => {
      // Access mocked methods directly on the imported prisma mock
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword as never);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: newHashedPassword,
      });

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({ success: true, message: 'Password changed successfully' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(currentPassword, hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: newHashedPassword },
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Password changed successfully', userId }),
      );
    });

    it('should return error if user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({ success: false, message: 'User not found or inactive' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return error if user is inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({ success: false, message: 'User not found or inactive' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return error if current password is incorrect', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false as never); // Current password incorrect

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({ success: false, message: 'Current password is incorrect' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(currentPassword, hashedPassword);
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return error and log if an exception occurs during findUnique', async () => {
      const error = new Error('DB find error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({
        success: false,
        message: 'Failed to change password due to an internal error.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error changing password',
          userId,
          error: error.message,
        }),
      );
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return error and log if an exception occurs during update', async () => {
      const error = new Error('DB update error');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword as never);
      (prisma.user.update as jest.Mock).mockRejectedValue(error); // Error during update

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({
        success: false,
        message: 'Failed to change password due to an internal error.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error changing password',
          userId,
          error: error.message,
        }),
      );
    });
  });

  describe('createPasswordResetRequest', () => {
    const email = 'test@example.com';
    const mockUser: User = {
      id: 'user-123',
      username: 'testuser',
      email: email,
      password: 'hashedPassword',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    };
    const mockToken = 'mockResetToken';

    beforeEach(() => {
      // Mock crypto.randomBytes
      (mockedCrypto.randomBytes as jest.Mock).mockReturnValue({
        toString: jest.fn().mockReturnValue(mockToken),
      });
    });

    it('should create reset token, save it, send email, and return success if user found and active', async () => {
      mockedUserService.getUserByEmailInternal.mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser); // Mock the update call
      mockedSendEmail.mockResolvedValue('mock-message-id'); // Mock successful email send with a string

      const result = await AuthService.createPasswordResetRequest(email);

      expect(result).toEqual({
        success: true,
        message: 'If a matching account was found, a password reset email has been sent.',
      });
      expect(mockedUserService.getUserByEmailInternal).toHaveBeenCalledWith(email);
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          resetToken: mockToken,
          resetTokenExpiry: expect.any(Date), // Check that expiry is a Date
        },
      });
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Password Reset Request',
          text: expect.stringContaining(mockToken),
          html: expect.stringContaining(mockToken),
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset request created and email sent',
          userId: mockUser.id,
        }),
      );
    });

    it('should return generic success message if user not found', async () => {
      mockedUserService.getUserByEmailInternal.mockResolvedValue(null);

      const result = await AuthService.createPasswordResetRequest(email);

      expect(result).toEqual({
        success: true,
        message: 'If a matching account was found, a password reset email has been sent.',
      });
      expect(mockedUserService.getUserByEmailInternal).toHaveBeenCalledWith(email);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset requested for non-existent or inactive email',
          email,
        }),
      );
    });

    it('should return generic success message if user is inactive', async () => {
      mockedUserService.getUserByEmailInternal.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await AuthService.createPasswordResetRequest(email);

      expect(result).toEqual({
        success: true,
        message: 'If a matching account was found, a password reset email has been sent.',
      });
      expect(mockedUserService.getUserByEmailInternal).toHaveBeenCalledWith(email);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset requested for non-existent or inactive email',
          email,
        }),
      );
    });

    it('should return generic success message and log error if an exception occurs', async () => {
      const error = new Error('Email service down');
      mockedUserService.getUserByEmailInternal.mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      mockedSendEmail.mockRejectedValue(error); // Simulate email sending error

      const result = await AuthService.createPasswordResetRequest(email);

      expect(result).toEqual({
        success: true,
        message: 'If a matching account was found, a password reset email has been sent.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error creating password reset request',
          email,
          error: error.message,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    const token = 'validResetToken';
    const newPassword = 'newSecurePassword';
    const newHashedPassword = 'hashedNewSecurePassword';
    const mockUser: User = {
      id: 'user-456',
      username: 'resetuser',
      email: 'reset@example.com',
      password: 'oldHashedPassword',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
      resetToken: token,
      resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // Expires in 1 hour
    };

    it('should reset password successfully if token is valid and not expired', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword as never);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: newHashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });
      mockedSendEmail.mockResolvedValue('mock-confirmation-id'); // Mock confirmation email with a string

      const result = await AuthService.resetPassword(token, newPassword);

      expect(result).toEqual({ success: true, message: 'Password reset successfully.' });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: expect.any(Date) },
          isActive: true,
        },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          password: newHashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Password reset successfully', userId: mockUser.id }),
      );
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: 'Your Password Has Been Reset',
        }),
      );
    });

    it('should return error if token is invalid or expired', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // Token not found or expired

      const result = await AuthService.resetPassword(token, newPassword);

      expect(result).toEqual({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: expect.any(Date) },
          isActive: true,
        },
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it('should return error if user is inactive', async () => {
      // Correct Mock: Simulate Prisma returning null because the where clause includes isActive: true
      (prisma.user.findFirst as jest.Mock).mockImplementation(async args => {
        if (args.where.resetToken === token && args.where.isActive === true) {
          // Simulate finding the user record but it doesn't match isActive: true
          // In a real scenario, Prisma would return null here based on the query.
          return null;
        }
        return null; // Default return null if conditions don't match
      });

      const result = await AuthService.resetPassword(token, newPassword);

      // The findFirst query includes isActive: true, so it should behave like token not found
      expect(result).toEqual({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: expect.any(Date) },
          isActive: true, // This clause makes it return null effectively
        },
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it('should return error and log if an exception occurs', async () => {
      const error = new Error('DB error during reset');
      (prisma.user.findFirst as jest.Mock).mockRejectedValue(error);

      const result = await AuthService.resetPassword(token, newPassword);

      expect(result).toEqual({
        success: false,
        message: 'Failed to reset password due to an internal error.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error resetting password',
          tokenUsed: 'yes',
          error: error.message,
        }),
      );
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(mockedSendEmail).not.toHaveBeenCalled();
    });
  });
});
