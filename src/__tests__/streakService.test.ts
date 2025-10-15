import { SupabaseStreakService } from '../services/streakService';

jest.mock('../services/authService', () => ({
  authService: {
    getSupabaseClient: jest.fn(() => mockSupabase),
    hasValidConfiguration: jest.fn(() => true),
  },
}));

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    upsert: jest.fn(() => ({
      data: null,
      error: null,
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
};

// Mock the Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Create a configured service instance for testing
const createTestService = () => {
  const service = new SupabaseStreakService();
  // Override the isConfigured flag to test actual logic
  (service as any).isConfigured = true;
  (service as any).supabase = mockSupabase;
  return service;
};

describe('StreakService', () => {
  const mockUserId = 'test-user-id';
  let streakService: SupabaseStreakService;

  beforeEach(() => {
    jest.clearAllMocks();
    streakService = createTestService();
  });

  describe('recordInteraction', () => {
    it('should record first interaction and set streak to 1', async () => {
      // Mock no previous interactions
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 0,
              longest_streak: 0,
              last_interaction_date: null,
              streak_freeze_count: 0
            }],
            error: null
          }))
        })),
        upsert: jest.fn(() => ({
          data: null,
          error: null
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await streakService.recordInteraction(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(1);
      expect(result.streakData?.longestStreak).toBe(1);
    });

    it('should increment streak for consecutive day interaction', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 5,
              longest_streak: 5,
              last_interaction_date: yesterday.toISOString().split('T')[0],
              streak_freeze_count: 0
            }],
            error: null
          }))
        })),
        upsert: jest.fn(() => ({
          data: null,
          error: null
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await streakService.recordInteraction(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(6);
      expect(result.streakData?.longestStreak).toBe(6);
    });

    it('should maintain streak when using freeze for 1-day gap', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 10,
              longest_streak: 10,
              last_interaction_date: twoDaysAgo.toISOString().split('T')[0],
              streak_freeze_count: 0
            }],
            error: null
          }))
        })),
        upsert: jest.fn(() => ({
          data: null,
          error: null
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await streakService.recordInteraction(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(10); // Maintained
      expect(result.streakData?.streakFreezeCount).toBe(1); // Used freeze
    });

    it('should reset streak when gap is too large', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 15,
              longest_streak: 15,
              last_interaction_date: threeDaysAgo.toISOString().split('T')[0],
              streak_freeze_count: 0
            }],
            error: null
          }))
        })),
        upsert: jest.fn(() => ({
          data: null,
          error: null
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await streakService.recordInteraction(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(1); // Reset to 1
    });

    it('should not change streak for same-day interaction', async () => {
      const today = new Date();

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 7,
              longest_streak: 7,
              last_interaction_date: today.toISOString().split('T')[0],
              streak_freeze_count: 0
            }],
            error: null
          }))
        })),
        upsert: jest.fn(() => ({
          data: null,
          error: null
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await streakService.recordInteraction(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(7); // No change
      expect(result.streakData?.longestStreak).toBe(7); // No change
    });
  });

  describe('getStreakData', () => {
    it('should return streak data for existing user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 5,
              longest_streak: 12,
              last_interaction_date: '2024-01-15',
              streak_freeze_count: 1
            }],
            error: null
          }))
        }))
      });

      const result = await streakService.getStreakData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(5);
      expect(result.streakData?.longestStreak).toBe(12);
      expect(result.streakData?.canUseFreeze).toBe(true);
    });

    it('should return default data for new user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      });

      const result = await streakService.getStreakData(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.currentStreak).toBe(0);
      expect(result.streakData?.longestStreak).toBe(0);
      expect(result.streakData?.canUseFreeze).toBe(true);
    });
  });

  describe('useStreakFreeze', () => {
    it('should use freeze when available', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 10,
              longest_streak: 10,
              last_interaction_date: '2024-01-15',
              streak_freeze_count: 0
            }],
            error: null
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await streakService.useStreakFreeze(mockUserId);

      expect(result.success).toBe(true);
      expect(result.streakData?.streakFreezeCount).toBe(1);
      expect(result.streakData?.canUseFreeze).toBe(true);
    });

    it('should reject when no freezes available', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              current_streak: 10,
              longest_streak: 10,
              last_interaction_date: '2024-01-15',
              streak_freeze_count: 2
            }],
            error: null
          }))
        }))
      });

      const result = await streakService.useStreakFreeze(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No streak freezes available');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      });

      const result = await streakService.getStreakData(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle network errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await streakService.recordInteraction(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });
});
