import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

// Mock the auth service
jest.mock('../services/authService', () => ({
  authService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
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

      const { result } = renderHook(() => useAuthStore());

      let signInResult: boolean;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(signInResult!).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign in errors', async () => {
      mockAuthService.signIn.mockResolvedValue({
        user: null,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuthStore());

      let signInResult: boolean;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(signInResult!).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should set loading state during sign in', async () => {
      mockAuthService.signIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ user: null }), 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);
    });
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

      const { result } = renderHook(() => useAuthStore());

      let signUpResult: boolean;
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password123');
      });

      expect(signUpResult!).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign up errors', async () => {
      mockAuthService.signUp.mockResolvedValue({
        user: null,
        error: 'Email already exists',
      });

      const { result } = renderHook(() => useAuthStore());

      let signUpResult: boolean;
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password123');
      });

      expect(signUpResult!).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: '123',
          email: 'test@example.com',
          profile: {
            targetLanguage: 'english',
            cefrLevel: 'A1',
            subscriptionStatus: 'trial',
            trialStartDate: new Date(),
          },
        },
        isAuthenticated: true,
      });

      mockAuthService.signOut.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and authentication state', () => {
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

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should clear user and authentication state when user is null', () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: '123',
          email: 'test@example.com',
          profile: {
            targetLanguage: 'english',
            cefrLevel: 'A1',
            subscriptionStatus: 'trial',
            trialStartDate: new Date(),
          },
        },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});