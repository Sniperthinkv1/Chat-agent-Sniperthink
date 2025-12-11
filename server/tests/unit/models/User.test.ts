import { UserModel } from '../../../src/models/User';
import { CreateUserData, UpdateUserData } from '../../../src/models/types';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('UserModel', () => {
  let mockDb: any;
  let userModel: UserModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    userModel = new UserModel(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userData: CreateUserData = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company'
      };

      const mockResult = {
        rows: [{
          user_id: 'test-user-1',
          email: 'test@example.com',
          company_name: 'Test Company',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await userModel.create(userData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['test-user-1', 'test@example.com', 'Test Company']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should create a user without company name', async () => {
      const userData: CreateUserData = {
        user_id: 'test-user-2',
        email: 'test2@example.com'
      };

      const mockResult = {
        rows: [{
          user_id: 'test-user-2',
          email: 'test2@example.com',
          company_name: null,
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await userModel.create(userData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['test-user-2', 'test2@example.com', null]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw error when database query fails', async () => {
      const userData: CreateUserData = {
        user_id: 'test-user-1',
        email: 'test@example.com'
      };

      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(userModel.create(userData)).rejects.toThrow('Failed to create user: Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      const mockUser = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userModel.findById('test-user-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE user_id = $1',
        ['test-user-1']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await userModel.findById('non-existent-user');

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(userModel.findById('test-user-1')).rejects.toThrow('Failed to find user: Database connection failed');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockUser = {
        user_id: 'test-user-1',
        email: 'test@example.com',
        company_name: 'Test Company',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userModel.findByEmail('test@example.com');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await userModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user email successfully', async () => {
      const updateData: UpdateUserData = {
        email: 'newemail@example.com'
      };

      const mockResult = {
        rows: [{
          user_id: 'test-user-1',
          email: 'newemail@example.com',
          company_name: 'Test Company',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await userModel.update('test-user-1', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users.*SET email = \$1.*WHERE user_id = \$2/s),
        ['newemail@example.com', 'test-user-1']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should update multiple fields successfully', async () => {
      const updateData: UpdateUserData = {
        email: 'newemail@example.com',
        company_name: 'New Company'
      };

      const mockResult = {
        rows: [{
          user_id: 'test-user-1',
          email: 'newemail@example.com',
          company_name: 'New Company',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await userModel.update('test-user-1', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users.*SET email = \$1, company_name = \$2.*WHERE user_id = \$3/s),
        ['newemail@example.com', 'New Company', 'test-user-1']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when user not found', async () => {
      const updateData: UpdateUserData = {
        email: 'newemail@example.com'
      };

      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await userModel.update('non-existent-user', updateData);

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      const updateData: UpdateUserData = {};

      await expect(userModel.update('test-user-1', updateData)).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await userModel.delete('test-user-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE user_id = $1',
        ['test-user-1']
      );
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      const result = await userModel.delete('non-existent-user');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should list users with default options', async () => {
      const mockUsers = [
        { user_id: 'user-1', email: 'user1@example.com', company_name: 'Company 1', created_at: new Date() },
        { user_id: 'user-2', email: 'user2@example.com', company_name: 'Company 2', created_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockUsers });

      const result = await userModel.list();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM users.*ORDER BY created_at DESC.*LIMIT \$1 OFFSET \$2/s),
        [100, 0]
      );
      expect(result).toEqual(mockUsers);
    });

    it('should list users with custom options', async () => {
      const mockUsers = [
        { user_id: 'user-1', email: 'user1@example.com', company_name: 'Company 1', created_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockUsers });

      const result = await userModel.list({
        limit: 10,
        offset: 5,
        orderBy: 'email',
        orderDirection: 'ASC'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM users.*ORDER BY email ASC.*LIMIT \$1 OFFSET \$2/s),
        [10, 5]
      );
      expect(result).toEqual(mockUsers);
    });
  });

  describe('exists', () => {
    it('should return true when user exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await userModel.exists('test-user-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM users WHERE user_id = $1',
        ['test-user-1']
      );
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await userModel.exists('non-existent-user');

      expect(result).toBe(false);
    });
  });
});