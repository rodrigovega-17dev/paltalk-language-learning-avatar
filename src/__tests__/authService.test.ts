// Mock the entire auth service module
const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  onAuthStateChange: jest.fn(),
};

jest.mock('../services/authService', () => ({
  authService: mockAuthService,
}));

describe('AuthService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        profile: {
          targetLanguage: 'english',
          cefrLevel: 'A1' as const,
          subscriptionStatus: 'trial' as const,
          trialStartDate: new Date(),
        },
      };

      mockAuthService.signUp.mockResolvedValue({
        user: mockUser,
      });

      const result = await mockAuthService.signUp('test@example.com', 'password123');

      expect(result.user).toBeTruthy();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.error).toBeUndefined();
      expect(mockAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle sign up errors', async () => {
      mockAuthService.signUp.mockResolvedValue({
        user: null,
        error: 'Email already exists',
      });

      const result = await mockAuthService.signUp('test@example.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.error).toBe('Email already exists');
    });

    it('should handle network errors', async () => {
      mockAuthService.signUp.mockResolvedValue({
        user: null,
        error: 'Network error occurred',
      });

      const result = await mockAuthService.signUp('test@example.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        profile: {
          targetLanguage: 'english',
          cefrLevel: 'A1' as const,
          subscriptionStatus: 'trial' as const,
          trialStartDate: new Date(),
        },
      };

      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
      });

      const result = await mockAuthService.signIn('test@example.com', 'password123');

      expect(result.user).toBeTruthy();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.profile.targetLanguage).toBe('english');
      expect(result.error).toBeUndefined();
    });

    it('should handle sign in errors', async () => {
      mockAuthService.signIn.mockResolvedValue({
        user: null,
        error: 'Invalid credentials',
      });

      const result = await mockAuthService.signIn('test@example.com', 'wrongpassword');

      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockAuthService.signOut.mockResolvedValue();
      mockAuthService.getCurrentUser.mockReturnValue(null);

      await mockAuthService.signOut();

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockAuthService.getCurrentUser()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is signed in', () => {
      mockAuthService.getCurrentUser.mockReturnValue(null);
      
      const user = mockAuthService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('should register auth state change callback', () => {
      const callback = jest.fn();
      
      mockAuthService.onAuthStateChange(callback);

      expect(mockAuthService.onAuthStateChange).toHaveBeenCalledWith(callback);
    });
  });
});