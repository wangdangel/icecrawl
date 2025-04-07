import { Request, Response } from 'express';
import { AdminUserController } from '../adminUserController';
import { UserService, SafeUser } from '../../services/userService';
import logger from '../../utils/logger';

// Mock services and logger
jest.mock('../../services/userService');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock Express Request and Response objects
const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = null): Partial<Request> => ({
  query,
  params,
  body,
  user, // For authenticated admin routes
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Type assertions for mocked services
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('AdminUserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const mockAdminUser = { id: 'admin-1', role: 'admin' }; // Simulate admin making request
  const mockSafeUser: SafeUser = { 
      id: 'user-1', 
      username: 'testuser', 
      role: 'user', 
      email: 'test@example.com', 
      isActive: true, 
      createdAt: new Date(), 
      updatedAt: new Date(), 
      lastLogin: undefined 
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse(); // Create a fresh response mock for each test
  });

  // --- getAllUsers ---
  describe('getAllUsers', () => {
    it('should return users with pagination info', async () => {
      req = mockRequest({ page: '1', limit: '5' }, {}, {}, mockAdminUser);
      const usersResult = { users: [mockSafeUser], total: 1 };
      mockedUserService.getAllUsers.mockResolvedValue(usersResult);

      await AdminUserController.getAllUsers(req as Request, res as Response);

      expect(mockedUserService.getAllUsers).toHaveBeenCalledWith(1, 5, {});
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: usersResult.users,
          pagination: {
            page: 1,
            limit: 5,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    });
    
    it('should handle filters correctly', async () => {
      req = mockRequest({ username: 'test', role: 'admin', isActive: 'false' }, {}, {}, mockAdminUser);
      mockedUserService.getAllUsers.mockResolvedValue({ users: [], total: 0 });

      await AdminUserController.getAllUsers(req as Request, res as Response);

      expect(mockedUserService.getAllUsers).toHaveBeenCalledWith(1, 10, {
        username: 'test',
        role: 'admin',
        isActive: false,
      });
    });

    it('should return 500 if an error occurs', async () => {
      req = mockRequest({}, {}, {}, mockAdminUser);
      const error = new Error('DB Error');
      mockedUserService.getAllUsers.mockRejectedValue(error);

      await AdminUserController.getAllUsers(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'An error occurred while getting users' });
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error getting users (admin)' }));
    });
  });

  // --- getUserById ---
  describe('getUserById', () => {
     it('should return user if found', async () => {
        req = mockRequest({}, { id: 'user-1' }, {}, mockAdminUser);
        mockedUserService.getUserById.mockResolvedValue(mockSafeUser);

        await AdminUserController.getUserById(req as Request, res as Response);

        expect(mockedUserService.getUserById).toHaveBeenCalledWith('user-1');
        expect(res.json).toHaveBeenCalledWith({
            status: 'success',
            data: { user: mockSafeUser },
        });
     });
     
     it('should return 404 if user not found', async () => {
        req = mockRequest({}, { id: 'not-found' }, {}, mockAdminUser);
        mockedUserService.getUserById.mockResolvedValue(null);

        await AdminUserController.getUserById(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'User not found' });
     });
     
     it('should return 500 if an error occurs', async () => {
        req = mockRequest({}, { id: 'user-1' }, {}, mockAdminUser);
        const error = new Error('DB Error');
        mockedUserService.getUserById.mockRejectedValue(error);

        await AdminUserController.getUserById(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'An error occurred while getting user' });
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error getting user by ID (admin)' }));
     });
  });

  // --- updateUser ---
  describe('updateUser', () => {
    const updateData = { username: 'updated', role: 'admin', isActive: false };
    const userId = 'user-to-update';
    const updatedUser = { ...mockSafeUser, id: userId, ...updateData };

    it('should update user successfully', async () => {
      req = mockRequest({}, { id: userId }, updateData, mockAdminUser);
      mockedUserService.getUserById.mockResolvedValue(mockSafeUser); // User exists
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null); // No username conflict
      // Explicitly cast the resolved value to SafeUser
      mockedUserService.updateUser.mockResolvedValue(updatedUser as SafeUser); 

      await AdminUserController.updateUser(req as Request, res as Response);

      expect(mockedUserService.updateUser).toHaveBeenCalledWith(userId, updateData);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User updated successfully',
        data: { user: updatedUser },
      });
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin updated user' }));
    });
    
    it('should return 400 for invalid input data', async () => {
        req = mockRequest({}, { id: userId }, { username: 'u' }, mockAdminUser); // Invalid username
        await AdminUserController.updateUser(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Invalid input' }));
     });

    it('should return 404 if user to update not found', async () => {
      req = mockRequest({}, { id: userId }, updateData, mockAdminUser);
      mockedUserService.getUserById.mockResolvedValue(null); // User doesn't exist

      await AdminUserController.updateUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'User not found' });
      expect(mockedUserService.updateUser).not.toHaveBeenCalled();
    });
    
    it('should return 409 if username conflicts', async () => {
      req = mockRequest({}, { id: userId }, updateData, mockAdminUser);
      mockedUserService.getUserById.mockResolvedValue(mockSafeUser); 
      mockedUserService.getUserByUsernameInternal.mockResolvedValue({ id: 'other-user' } as any); // Conflict

      await AdminUserController.updateUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Username already exists' });
    });
    
     it('should return 500 if an error occurs', async () => {
      req = mockRequest({}, { id: userId }, updateData, mockAdminUser);
      const error = new Error('DB Error');
      mockedUserService.getUserById.mockResolvedValue(mockSafeUser);
      mockedUserService.getUserByUsernameInternal.mockResolvedValue(null);
      mockedUserService.updateUser.mockRejectedValue(error);

      await AdminUserController.updateUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'An error occurred while updating user' });
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error updating user (admin)' }));
    });
  });

  // --- deleteUser ---
  describe('deleteUser', () => {
     const userIdToDelete = 'user-to-delete';

     it('should deactivate user (soft delete) successfully', async () => {
        req = mockRequest({}, { id: userIdToDelete }, {}, mockAdminUser);
        mockedUserService.getUserById.mockResolvedValue({ ...mockSafeUser, id: userIdToDelete });
        mockedUserService.deleteUser.mockResolvedValue(true);

        await AdminUserController.deleteUser(req as Request, res as Response);

        expect(mockedUserService.deleteUser).toHaveBeenCalledWith(userIdToDelete);
        expect(mockedUserService.permanentlyDeleteUser).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'User deactivated' });
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin deactivated user' }));
     });
     
     it('should permanently delete user successfully if permanent=true', async () => {
        req = mockRequest({ permanent: 'true' }, { id: userIdToDelete }, {}, mockAdminUser);
        mockedUserService.getUserById.mockResolvedValue({ ...mockSafeUser, id: userIdToDelete });
        mockedUserService.permanentlyDeleteUser.mockResolvedValue(true);

        await AdminUserController.deleteUser(req as Request, res as Response);

        expect(mockedUserService.permanentlyDeleteUser).toHaveBeenCalledWith(userIdToDelete);
        expect(mockedUserService.deleteUser).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'User permanently deleted' });
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin permanently deleted user' }));
     });
     
     it('should return 404 if user to delete not found', async () => {
        req = mockRequest({}, { id: userIdToDelete }, {}, mockAdminUser);
        mockedUserService.getUserById.mockResolvedValue(null); // User not found

        await AdminUserController.deleteUser(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'User not found' });
        expect(mockedUserService.deleteUser).not.toHaveBeenCalled();
        expect(mockedUserService.permanentlyDeleteUser).not.toHaveBeenCalled();
     });
     
     it('should return 400 if admin tries to delete self', async () => {
        req = mockRequest({}, { id: mockAdminUser.id }, {}, mockAdminUser); // Trying to delete self
        mockedUserService.getUserById.mockResolvedValue({ ...mockSafeUser, id: mockAdminUser.id });

        await AdminUserController.deleteUser(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Cannot delete your own account' });
     });
     
     it('should return 500 if service fails to delete', async () => {
        req = mockRequest({}, { id: userIdToDelete }, {}, mockAdminUser);
        mockedUserService.getUserById.mockResolvedValue({ ...mockSafeUser, id: userIdToDelete });
        mockedUserService.deleteUser.mockResolvedValue(false); // Service returns failure

        await AdminUserController.deleteUser(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Failed to delete user' });
     });
     
     it('should return 500 if an error occurs', async () => {
        req = mockRequest({}, { id: userIdToDelete }, {}, mockAdminUser);
        const error = new Error('DB Error');
        mockedUserService.getUserById.mockResolvedValue({ ...mockSafeUser, id: userIdToDelete });
        mockedUserService.deleteUser.mockRejectedValue(error); // Simulate exception

        await AdminUserController.deleteUser(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'An error occurred while deleting user' });
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error deleting user (admin)' }));
     });
  });
});
