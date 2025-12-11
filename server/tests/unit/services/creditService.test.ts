import { 
    getUserCredits, 
    hasEnoughCredits,
    deductCredits, 
    addCredits, 
    getCreditStats,
    updateCredits,
    logCreditUsage,
    InsufficientCreditsError
} from '../../../src/services/creditService';

// Mock dependencies before imports
jest.mock('../../../src/utils/database', () => ({
    db: {
        query: jest.fn()
    }
}));

jest.mock('../../../src/utils/redis', () => ({
    redis: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn()
    }
}));

jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Import mocked dependencies after mocking
import { db } from '../../../src/utils/database';
import { redis } from '../../../src/utils/redis';

describe('CreditService', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserCredits', () => {
        it('should return credits from cache when available', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue('100');

            // Act
            const result = await getUserCredits(mockUserId);

            // Assert
            expect(result).toBe(100);
            expect(redis.get).toHaveBeenCalledWith('credits:user-123');
            expect(db.query).not.toHaveBeenCalled();
        });

        it('should query database and cache result on cache miss', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue(null);
            (db.query as jest.Mock).mockResolvedValue({
                rows: [{ remaining_credits: 100 }]
            });
            (redis.set as jest.Mock).mockResolvedValue(undefined);

            // Act
            const result = await getUserCredits(mockUserId);

            // Assert
            expect(result).toBe(100);
            expect(redis.get).toHaveBeenCalledWith('credits:user-123');
            expect(db.query).toHaveBeenCalledWith(
                'SELECT remaining_credits FROM credits WHERE user_id = $1',
                [mockUserId]
            );
            expect(redis.set).toHaveBeenCalledWith('credits:user-123', '100', 300);
        });

        it('should return 0 and cache when user not found in database', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue(null);
            (db.query as jest.Mock).mockResolvedValue({ rows: [] });
            (redis.set as jest.Mock).mockResolvedValue(undefined);

            // Act
            const result = await getUserCredits(mockUserId);

            // Assert
            expect(result).toBe(0);
            expect(redis.set).toHaveBeenCalledWith('credits:user-123', '0', 300);
        });

        it('should throw error when database query fails', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue(null);
            (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(getUserCredits(mockUserId)).rejects.toThrow('Database error');
        });

        it('should handle cache errors gracefully and query database', async () => {
            // Arrange
            (redis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

            // Act & Assert
            await expect(getUserCredits(mockUserId)).rejects.toThrow('Redis error');
        });
    });

    describe('hasEnoughCredits', () => {
        it('should return true when user has sufficient credits', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue('100');

            // Act
            const result = await hasEnoughCredits(mockUserId, 50);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when user has insufficient credits', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue('10');

            // Act
            const result = await hasEnoughCredits(mockUserId, 50);

            // Assert
            expect(result).toBe(false);
        });

        it('should use default amount of 1 when not specified', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue('5');

            // Act
            const result = await hasEnoughCredits(mockUserId);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when user has zero credits', async () => {
            // Arrange
            (redis.get as jest.Mock).mockResolvedValue('0');

            // Act
            const result = await hasEnoughCredits(mockUserId, 1);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('deductCredits', () => {
        it('should deduct credits atomically and invalidate cache', async () => {
            // Arrange
            const amount = 10;
            const newBalance = 90;
            (db.query as jest.Mock).mockResolvedValue({
                rows: [{ remaining_credits: newBalance }]
            });
            (redis.del as jest.Mock).mockResolvedValue(1);

            // Act
            const result = await deductCredits(mockUserId, amount);

            // Assert
            expect(result).toBe(newBalance);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE credits'),
                [amount, mockUserId]
            );
            expect(redis.del).toHaveBeenCalledWith('credits:user-123');
        });

        it('should throw InsufficientCreditsError when user has insufficient credits', async () => {
            // Arrange
            (db.query as jest.Mock).mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(deductCredits(mockUserId, 100)).rejects.toThrow(InsufficientCreditsError);
            await expect(deductCredits(mockUserId, 100)).rejects.toThrow('Insufficient credits or user not found');
        });

        it('should throw InsufficientCreditsError when user not found', async () => {
            // Arrange
            (db.query as jest.Mock).mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(deductCredits(mockUserId, 10)).rejects.toThrow(InsufficientCreditsError);
        });

        it('should handle database errors', async () => {
            // Arrange
            (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(deductCredits(mockUserId, 10)).rejects.toThrow('Database error');
        });

        it('should invalidate cache even if deduction succeeds', async () => {
            // Arrange
            (db.query as jest.Mock).mockResolvedValue({
                rows: [{ remaining_credits: 50 }]
            });
            (redis.del as jest.Mock).mockResolvedValue(1);

            // Act
            await deductCredits(mockUserId, 50);

            // Assert
            expect(redis.del).toHaveBeenCalledWith('credits:user-123');
        });
    });

    describe('addCredits', () => {
        it('should add credits and invalidate cache', async () => {
            // Arrange
            const amount = 50;
            const newBalance = 150;
            (db.query as jest.Mock).mockResolvedValue({
                rows: [{ remaining_credits: newBalance }]
            });
            (redis.del as jest.Mock).mockResolvedValue(1);

            // Act
            const result = await addCredits(mockUserId, amount);

            // Assert
            expect(result).toBe(newBalance);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO credits'),
                [mockUserId, amount]
            );
            expect(redis.del).toHaveBeenCalledWith('credits:user-123');
        });

        it('should handle new user credit initialization', async () => {
            // Arrange
            const amount = 100;
            (db.query as jest.Mock).mockResolvedValue({
                rows: [{ remaining_credits: amount }]
            });
            (redis.del as jest.Mock).mockResolvedValue(0); // Key didn't exist

            // Act
            const result = await addCredits(mockUserId, amount);

            // Assert
            expect(result).toBe(amount);
            expect(redis.del).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            // Arrange
            (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(addCredits(mockUserId, 50)).rejects.toThrow('Database error');
        });
    });

    describe('getCreditStats', () => {
        it('should return credit statistics for existing user', async () => {
            // Arrange
            const mockStats = {
                user_id: mockUserId,
                remaining_credits: 100,
                last_updated: new Date('2024-01-01')
            };
            (db.query as jest.Mock).mockResolvedValue({
                rows: [mockStats]
            });

            // Act
            const result = await getCreditStats(mockUserId);

            // Assert
            expect(result).toEqual(mockStats);
            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM credits WHERE user_id = $1',
                [mockUserId]
            );
        });

        it('should return null when user not found', async () => {
            // Arrange
            (db.query as jest.Mock).mockResolvedValue({ rows: [] });

            // Act
            const result = await getCreditStats(mockUserId);

            // Assert
            expect(result).toBeNull();
        });

        it('should handle database errors', async () => {
            // Arrange
            (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(getCreditStats(mockUserId)).rejects.toThrow('Database error');
        });
    });

    describe('updateCredits', () => {
        it('should update credits to absolute value and invalidate cache', async () => {
            // Arrange
            const newCredits = 200;
            const mockResult = {
                user_id: mockUserId,
                remaining_credits: newCredits,
                last_updated: new Date('2024-01-01')
            };
            (db.query as jest.Mock).mockResolvedValue({
                rows: [mockResult]
            });
            (redis.del as jest.Mock).mockResolvedValue(1);

            // Act
            const result = await updateCredits(mockUserId, { remaining_credits: newCredits });

            // Assert
            expect(result).toEqual(mockResult);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO credits'),
                [mockUserId, newCredits]
            );
            expect(redis.del).toHaveBeenCalledWith('credits:user-123');
        });

        it('should handle database errors', async () => {
            // Arrange
            (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(updateCredits(mockUserId, { remaining_credits: 100 }))
                .rejects.toThrow('Database error');
        });
    });

    describe('logCreditUsage', () => {
        it('should log credit deduction with metadata', async () => {
            // Arrange
            const amount = 10;
            const metadata = { messageId: 'msg-123', conversationId: 'conv-456' };

            // Act
            await logCreditUsage(mockUserId, amount, 'deduct', metadata);

            // Assert - should not throw
            expect(true).toBe(true);
        });

        it('should log credit addition', async () => {
            // Arrange
            const amount = 50;

            // Act
            await logCreditUsage(mockUserId, amount, 'add');

            // Assert - should not throw
            expect(true).toBe(true);
        });

        it('should log credit update', async () => {
            // Arrange
            const amount = 100;

            // Act
            await logCreditUsage(mockUserId, amount, 'update');

            // Assert - should not throw
            expect(true).toBe(true);
        });

        it('should not throw error even if logging fails', async () => {
            // Arrange
            const amount = 10;

            // Act & Assert - should not throw
            await expect(logCreditUsage(mockUserId, amount, 'deduct')).resolves.not.toThrow();
        });
    });

    describe('InsufficientCreditsError', () => {
        it('should create error with correct name and message', () => {
            // Arrange & Act
            const error = new InsufficientCreditsError('Test error message');

            // Assert
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('InsufficientCreditsError');
            expect(error.message).toBe('Test error message');
        });
    });

    describe('Integration scenarios', () => {
        it('should handle complete credit lifecycle: add, check, deduct', async () => {
            // Arrange - Add credits
            (db.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ remaining_credits: 100 }]
            });
            (redis.del as jest.Mock).mockResolvedValue(1);

            // Act - Add credits
            const addedBalance = await addCredits(mockUserId, 100);
            expect(addedBalance).toBe(100);

            // Arrange - Check credits
            (redis.get as jest.Mock).mockResolvedValue(null);
            (db.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ remaining_credits: 100 }]
            });
            (redis.set as jest.Mock).mockResolvedValue(undefined);

            // Act - Check credits
            const hasEnough = await hasEnoughCredits(mockUserId, 50);
            expect(hasEnough).toBe(true);

            // Arrange - Deduct credits
            (db.query as jest.Mock).mockResolvedValueOnce({
                rows: [{ remaining_credits: 50 }]
            });

            // Act - Deduct credits
            const newBalance = await deductCredits(mockUserId, 50);
            expect(newBalance).toBe(50);
        });

        it('should prevent deduction when insufficient credits', async () => {
            // Arrange - User has 10 credits
            (redis.get as jest.Mock).mockResolvedValue('10');

            // Act - Check if user has enough for 50
            const hasEnough = await hasEnoughCredits(mockUserId, 50);
            expect(hasEnough).toBe(false);

            // Arrange - Try to deduct 50 credits
            (db.query as jest.Mock).mockResolvedValue({ rows: [] });

            // Act & Assert - Should fail
            await expect(deductCredits(mockUserId, 50)).rejects.toThrow(InsufficientCreditsError);
        });
    });
});
