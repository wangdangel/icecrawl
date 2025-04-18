import { Request, Response } from 'express';
import { UserController } from '../userController';
import { UserService, SafeUser } from '../../services/userService';
import { AuthService } from '../../services/authService';
import { SessionService } from '../../services/sessionService';
import logger from '../../utils/logger';

// Mock services and logger
jest.mock('../../services/userService');
jest.mock('../../services/authService');
jest.mock('../../services/sessionService');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock Express Request and Response objects
const mockRequest = (body: any = {}, user: any = null, headers: any = {}): Partial<Request> => ({
  body,
  user, // For authenticated routes
  headers,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Type assertions for mocked services
const mockedUserService = UserService as jest.Mocked<typeof UserService>;
const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockedSessionService = SessionService as jest.Mocked<typeof SessionService>;

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse(); // Create a fresh response mock for each test
  });

  // --- login ---
  describe('login', () => {
    const loginData = { username: 'testuser', password: 'password123' };
    const mockSafeUser: SafeUser = {
      id: 'user-1',
      username: 'testuser',
      role: 'user',
      email: 'test@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
    };
    const mockToken = 'mock-jwt-token';
    const mockSessionToken = 'mock-session-token';

    it('should login user successfully and return token, session, and user info', async () => {
      req = mockRequest(loginData);
      mockedAuthService.verifyCredentials.mockResolvedValue(mockSafeUser);
      mockedAuthService.generateToken.mockReturnValue(mockToken);
      mockedSessionService.createSession.mockResolvedValue(mockSessionToken);

      await UserController.login(req as Request, res as Response);

      expect(mockedAuthService.verifyCredentials).toHaveBeenCalledWith(
        loginData.username,
        loginData.password,
      );
      expect(mockedAuthService.generateToken).toHaveBeenCalledWith(mockSafeUser);
      expect(mockedSessionService.createSession).toHaveBeenCalledWith(mockSafeUser.id);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        token: mockToken,
        sessionToken: mockSessionToken,
        user: {
          id: mockSafeUser.id,
          username: mockSafeUser.username,
          role: mockSafeUser.role,
          email: mockSafeUser.email,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User logged in' }),
      );
    });

    it('should return 400 for invalid input data', async () => {
      req = mockRequest({ username: 'test' }); // Missing password
      await UserController.login(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid input' }),
      );
    });

    it('should return 401 for invalid credentials', async () => {
      req = mockRequest(loginData);
      mockedAuthService.verifyCredentials.mockResolvedValue(null); // Simulate invalid credentials

      await UserController.login(req as Request, res as Response);

      expect(mockedAuthService.verifyCredentials).toHaveBeenCalledWith(
        loginData.username,
        loginData.password,
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid username or password',
      });
    });

    it('should return 500 if an error occurs during login', async () => {
      req = mockRequest(loginData);
      const error = new Error('Something went wrong');
      mockedAuthService.verifyCredentials.mockRejectedValue(error);

      await UserController.login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred during login',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Login error' }),
      );
    });
  });

  // --- register ---
  describe('register', () => {
    const registerData = { username: 'newuser', password: 'password123', email: 'new@example.com' };
    const mockCreatedUser: SafeUser = {
      id: 'user-new',
      username: 'newuser',
      role: 'user',
      email: 'new@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
    };

    it('should register user successfully', async () => {
      req = mockRequest(registerData);
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null); // No existing username
      mockedUserService.getUserByEmailInternal.mockResolvedValue(null); // No existing email
      mockedUserService.createUser.mockResolvedValue(mockCreatedUser);

      await UserController.register(req as Request, res as Response);

      expect(mockedUserService.getUserByUsernameInternal).toHaveBeenCalledWith(
        registerData.username,
      );
      expect(mockedUserService.getUserByEmailInternal).toHaveBeenCalledWith(registerData.email);
      expect(mockedUserService.createUser).toHaveBeenCalledWith(registerData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User registered successfully',
        user: {
          id: mockCreatedUser.id,
          username: mockCreatedUser.username,
          role: mockCreatedUser.role,
          email: mockCreatedUser.email,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User registered' }),
      );
    });

    it('should return 400 for invalid input data', async () => {
      req = mockRequest({ username: 'u', password: 'p' }); // Invalid data
      await UserController.register(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid input' }),
      );
    });

    it('should return 409 if username already exists', async () => {
      req = mockRequest(registerData);
      mockedUserService.getUserByUsernameInternal.mockResolvedValue({} as any); // Simulate user found

      await UserController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Username already exists',
      });
      expect(mockedUserService.createUser).not.toHaveBeenCalled();
    });

    it('should return 409 if email already exists', async () => {
      req = mockRequest(registerData);
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null);
      mockedUserService.getUserByEmailInternal.mockResolvedValue({} as any); // Simulate email found

      await UserController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Email already registered',
      });
      expect(mockedUserService.createUser).not.toHaveBeenCalled();
    });

    it('should return 500 if an error occurs during registration', async () => {
      req = mockRequest(registerData);
      const error = new Error('DB connection error');
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null);
      mockedUserService.getUserByEmailInternal.mockResolvedValue(null);
      mockedUserService.createUser.mockRejectedValue(error);

      await UserController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred during registration',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Registration error' }),
      );
    });
  });

  // --- getCurrentUser ---
  describe('getCurrentUser', () => {
    const mockSafeUser: SafeUser = {
      id: 'user-1',
      username: 'testuser',
      role: 'user',
      email: 'test@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
    };

    it('should return current user data if authenticated', async () => {
      req = mockRequest({}, { id: 'user-1' }); // Simulate authenticated user
      mockedUserService.getUserById.mockResolvedValue(mockSafeUser);

      await UserController.getCurrentUser(req as Request, res as Response);

      expect(mockedUserService.getUserById).toHaveBeenCalledWith('user-1');
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        user: mockSafeUser,
      });
    });

    it('should return 404 if user not found (edge case)', async () => {
      req = mockRequest({}, { id: 'user-1' });
      mockedUserService.getUserById.mockResolvedValue(null); // Simulate user not found despite valid token

      await UserController.getCurrentUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'User not found' });
    });

    it('should return 500 if an error occurs', async () => {
      req = mockRequest({}, { id: 'user-1' });
      const error = new Error('DB Error');
      mockedUserService.getUserById.mockRejectedValue(error);

      await UserController.getCurrentUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while getting user information',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error getting user profile' }),
      );
    });
  });

  // --- updateCurrentUser ---
  describe('updateCurrentUser', () => {
    const updateData = { username: 'updateduser', email: 'updated@example.com' };
    const mockSafeUser: SafeUser = {
      id: 'user-1',
      username: 'testuser',
      role: 'user',
      email: 'test@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: undefined,
    };
    const updatedUser = { ...mockSafeUser, ...updateData };

    it('should update user successfully', async () => {
      req = mockRequest(updateData, { id: 'user-1' });
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null); // No username conflict
      mockedUserService.getUserByEmailInternal.mockResolvedValue(null); // No email conflict
      mockedUserService.updateUser.mockResolvedValue(updatedUser);

      await UserController.updateCurrentUser(req as Request, res as Response);

      expect(mockedUserService.updateUser).toHaveBeenCalledWith('user-1', updateData);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User updated successfully',
        user: updatedUser,
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User updated profile' }),
      );
    });

    it('should return 400 for invalid input data', async () => {
      req = mockRequest({ username: 'u' }, { id: 'user-1' }); // Invalid username length
      await UserController.updateCurrentUser(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid input' }),
      );
    });

    it('should return 409 if username conflicts with another user', async () => {
      req = mockRequest(updateData, { id: 'user-1' });
      mockedUserService.getUserByUsernameInternal.mockResolvedValue({ id: 'user-2' } as any); // Conflict

      await UserController.updateCurrentUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Username already exists',
      });
      expect(mockedUserService.updateUser).not.toHaveBeenCalled();
    });

    it('should return 409 if email conflicts with another user', async () => {
      req = mockRequest(updateData, { id: 'user-1' });
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null);
      mockedUserService.getUserByEmailInternal.mockResolvedValue({ id: 'user-2' } as any); // Conflict

      await UserController.updateCurrentUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Email already registered',
      });
      expect(mockedUserService.updateUser).not.toHaveBeenCalled();
    });

    it('should allow updating username/email to the same value', async () => {
      req = mockRequest({ username: 'testuser', email: 'test@example.com' }, { id: 'user-1' });
      mockedUserService.getUserByUsernameInternal.mockResolvedValue({
        ...mockSafeUser,
        id: 'user-1',
      } as any); // Found self
      mockedUserService.getUserByEmailInternal.mockResolvedValue({
        ...mockSafeUser,
        id: 'user-1',
      } as any); // Found self
      mockedUserService.updateUser.mockResolvedValue({
        ...mockSafeUser,
        username: 'testuser',
        email: 'test@example.com',
      });

      await UserController.updateCurrentUser(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
      expect(mockedUserService.updateUser).toHaveBeenCalled();
    });

    it('should return 500 if an error occurs', async () => {
      req = mockRequest(updateData, { id: 'user-1' });
      const error = new Error('DB Error');
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null);
      mockedUserService.getUserByEmailInternal.mockResolvedValue(null);
      mockedUserService.updateUser.mockRejectedValue(error);

      await UserController.updateCurrentUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while updating user information',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error updating user profile' }),
      );
    });
  });

  // --- changePassword ---
  describe('changePassword', () => {
    const passwordData = { currentPassword: 'old', newPassword: 'newPassword123' };

    it('should change password successfully', async () => {
      req = mockRequest(passwordData, { id: 'user-1' });
      mockedAuthService.changePassword.mockResolvedValue({ success: true, message: 'Success' });

      await UserController.changePassword(req as Request, res as Response);

      expect(mockedAuthService.changePassword).toHaveBeenCalledWith(
        'user-1',
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password changed successfully',
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User changed password' }),
      );
    });

    it('should return 400 for invalid input', async () => {
      req = mockRequest({ currentPassword: 'old' }, { id: 'user-1' }); // Missing newPassword
      await UserController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid input' }),
      );
    });

    it('should return 401 if current password is incorrect', async () => {
      req = mockRequest(passwordData, { id: 'user-1' });
      mockedAuthService.changePassword.mockResolvedValue({
        success: false,
        message: 'Incorrect password',
      });

      await UserController.changePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Incorrect password' });
    });

    it('should return 500 if an error occurs', async () => {
      req = mockRequest(passwordData, { id: 'user-1' });
      const error = new Error('Something went wrong');
      mockedAuthService.changePassword.mockRejectedValue(error);

      await UserController.changePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while changing password',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error changing password' }),
      );
    });
  });

  // --- requestPasswordReset ---
  describe('requestPasswordReset', () => {
    const requestData = { email: 'test@example.com' };

    it('should return success message', async () => {
      req = mockRequest(requestData);
      mockedAuthService.createPasswordResetRequest.mockResolvedValue({
        success: true,
        message: '',
      }); // Message doesn't matter here

      await UserController.requestPasswordReset(req as Request, res as Response);

      expect(mockedAuthService.createPasswordResetRequest).toHaveBeenCalledWith(requestData.email);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'If a matching account was found, a password reset email has been sent',
      });
    });

    it('should return 400 for invalid input', async () => {
      req = mockRequest({ email: 'invalid-email' });
      await UserController.requestPasswordReset(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid input' }),
      );
    });

    it('should return 500 if an error occurs', async () => {
      req = mockRequest(requestData);
      const error = new Error('Email service down');
      mockedAuthService.createPasswordResetRequest.mockRejectedValue(error); // Simulate error in service

      await UserController.requestPasswordReset(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while creating password reset request',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error creating password reset request' }),
      );
    });
  });

  // --- resetPassword ---
  describe('resetPassword', () => {
    const resetData = { token: 'valid-token', newPassword: 'newPassword123' };

    it('should reset password successfully', async () => {
      req = mockRequest(resetData);
      mockedAuthService.resetPassword.mockResolvedValue({ success: true, message: 'Success' });

      await UserController.resetPassword(req as Request, res as Response);

      expect(mockedAuthService.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.newPassword,
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password reset successfully',
      });
    });

    it('should return 400 for invalid input', async () => {
      req = mockRequest({ token: 't' }); // Missing password
      await UserController.resetPassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid input' }),
      );
    });

    it('should return 401 for invalid/expired token', async () => {
      req = mockRequest(resetData);
      mockedAuthService.resetPassword.mockResolvedValue({
        success: false,
        message: 'Invalid token',
      });

      await UserController.resetPassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid token' });
    });

    it('should return 500 if an error occurs', async () => {
      req = mockRequest(resetData);
      const error = new Error('DB error');
      mockedAuthService.resetPassword.mockRejectedValue(error);

      await UserController.resetPassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while resetting password',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error resetting password' }),
      );
    });
  });

  // --- logout ---
  describe('logout', () => {
    it('should logout user successfully', async () => {
      req = mockRequest({}, { id: 'user-1' }, { authorization: 'Bearer valid-session-token' });
      mockedSessionService.invalidateSession.mockReturnValue(true);

      UserController.logout(req as Request, res as Response); // Logout is synchronous

      expect(mockedSessionService.invalidateSession).toHaveBeenCalledWith('valid-session-token');
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User logged out' }),
      );
    });

    it('should return 401 if no auth header', () => {
      req = mockRequest({}, { id: 'user-1' }, {}); // No auth header
      UserController.logout(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Not authenticated or session token missing' }),
      );
    });

    it('should return 401 if auth header is not Bearer', () => {
      req = mockRequest({}, { id: 'user-1' }, { authorization: 'Basic abc' });
      UserController.logout(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Not authenticated or session token missing' }),
      );
    });

    it('should return 400 if session invalidation fails', () => {
      req = mockRequest({}, { id: 'user-1' }, { authorization: 'Bearer invalid-token' });
      mockedSessionService.invalidateSession.mockReturnValue(false); // Simulate failure

      UserController.logout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to invalidate session or session already invalid',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Logout attempt with invalid or already invalidated token',
        }),
      );
    });

    it('should return 500 if an error occurs', () => {
      req = mockRequest({}, { id: 'user-1' }, { authorization: 'Bearer valid-token' });
      const error = new Error('Session service error');
      mockedSessionService.invalidateSession.mockImplementation(() => {
        throw error;
      });

      UserController.logout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An error occurred while logging out',
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error logging out' }),
      );
    });
  });
});
