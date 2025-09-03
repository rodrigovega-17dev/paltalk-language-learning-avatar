import { UserProfile } from '../types/auth';

// Mock the entire profileService module
const mockUpdateProfile = jest.fn();
const mockGetProfile = jest.fn();

jest.mock('../services/profileService', () => ({
  profileService: {
    updateProfile: mockUpdateProfile,
    getProfile: mockGetProfile,
  },
}));

// Import after mocking
const { profileService } = require('../services/profileService');

describe('ProfileService', () => {
  const mockUserId = 'test-user-id';
  const mockProfile: UserProfile = {
    targetLanguage: 'spanish',
    cefrLevel: 'B1',
    subscriptionStatus: 'active',
    trialStartDate: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('should successfully update profile', async () => {
      mockUpdateProfile.mockResolvedValue({ success: true });

      const result = await profileService.updateProfile(mockUserId, {
        targetLanguage: 'french',
        cefrLevel: 'B2',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUserId, {
        targetLanguage: 'french',
        cefrLevel: 'B2',
      });
    });

    it('should handle update errors', async () => {
      mockUpdateProfile.mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      const result = await profileService.updateProfile(mockUserId, {
        targetLanguage: 'german',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle network errors', async () => {
      mockUpdateProfile.mockResolvedValue({
        success: false,
        error: 'Network error occurred',
      });

      const result = await profileService.updateProfile(mockUserId, {
        targetLanguage: 'english',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should correctly call updateProfile with all fields', async () => {
      mockUpdateProfile.mockResolvedValue({ success: true });

      await profileService.updateProfile(mockUserId, {
        targetLanguage: 'spanish',
        cefrLevel: 'C1',
        subscriptionStatus: 'trial',
        trialStartDate: new Date('2024-02-01'),
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUserId, {
        targetLanguage: 'spanish',
        cefrLevel: 'C1',
        subscriptionStatus: 'trial',
        trialStartDate: new Date('2024-02-01'),
      });
    });
  });

  describe('getProfile', () => {
    it('should successfully retrieve profile', async () => {
      const expectedProfile = {
        targetLanguage: 'french',
        cefrLevel: 'B2' as const,
        subscriptionStatus: 'active' as const,
        trialStartDate: new Date('2024-01-01T00:00:00.000Z'),
      };

      mockGetProfile.mockResolvedValue({
        profile: expectedProfile,
      });

      const result = await profileService.getProfile(mockUserId);

      expect(result.profile).toEqual(expectedProfile);
      expect(result.error).toBeUndefined();
      expect(mockGetProfile).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle profile not found', async () => {
      mockGetProfile.mockResolvedValue({
        profile: null,
        error: 'Profile not found',
      });

      const result = await profileService.getProfile(mockUserId);

      expect(result.profile).toBeNull();
      expect(result.error).toBe('Profile not found');
    });

    it('should handle database errors', async () => {
      mockGetProfile.mockResolvedValue({
        profile: null,
        error: 'Database error',
      });

      const result = await profileService.getProfile(mockUserId);

      expect(result.profile).toBeNull();
      expect(result.error).toBe('Database error');
    });

    it('should handle network errors', async () => {
      mockGetProfile.mockResolvedValue({
        profile: null,
        error: 'Network error occurred',
      });

      const result = await profileService.getProfile(mockUserId);

      expect(result.profile).toBeNull();
      expect(result.error).toBe('Network error occurred');
    });
  });
});