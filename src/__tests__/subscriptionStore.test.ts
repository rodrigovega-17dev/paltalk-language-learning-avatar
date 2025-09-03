import { renderHook, act } from '@testing-library/react-native';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import subscriptionService from '../services/subscriptionService';

// Mock the subscription service
jest.mock('../services/subscriptionService', () => ({
  checkSubscriptionStatus: jest.fn(),
  purchaseSubscription: jest.fn(),
  restorePurchases: jest.fn(),
}));

const mockSubscriptionService = subscriptionService as jest.Mocked<typeof subscriptionService>;

describe('useSubscriptionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useSubscriptionStore.setState({
      subscriptionStatus: {
        isActive: false,
        isTrialActive: false,
        trialDaysRemaining: 0
      },
      isLoading: false,
      error: null
    });
  });

  describe('checkSubscriptionStatus', () => {
    it('should update subscription status on success', async () => {
      const mockStatus = {
        isActive: true,
        isTrialActive: false,
        trialDaysRemaining: 0,
        productId: 'premium_monthly'
      };

      mockSubscriptionService.checkSubscriptionStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.checkSubscriptionStatus();
      });

      expect(result.current.subscriptionStatus).toEqual(mockStatus);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when checking subscription status', async () => {
      const error = new Error('Network error');
      mockSubscriptionService.checkSubscriptionStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.checkSubscriptionStatus();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during check', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSubscriptionService.checkSubscriptionStatus.mockReturnValue(promise);

      const { result } = renderHook(() => useSubscriptionStore());

      act(() => {
        result.current.checkSubscriptionStatus();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          isActive: false,
          isTrialActive: false,
          trialDaysRemaining: 0
        });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('purchaseSubscription', () => {
    it('should return true and refresh status on successful purchase', async () => {
      const mockPurchaseResult = { success: true };
      const mockStatus = {
        isActive: true,
        isTrialActive: false,
        trialDaysRemaining: 0,
        productId: 'premium_monthly'
      };

      mockSubscriptionService.purchaseSubscription.mockResolvedValue(mockPurchaseResult);
      mockSubscriptionService.checkSubscriptionStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useSubscriptionStore());

      let purchaseResult: boolean;
      await act(async () => {
        purchaseResult = await result.current.purchaseSubscription('premium_monthly');
      });

      expect(purchaseResult!).toBe(true);
      expect(result.current.subscriptionStatus).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
    });

    it('should return false and set error on failed purchase', async () => {
      const mockPurchaseResult = { success: false, error: 'Payment failed' };

      mockSubscriptionService.purchaseSubscription.mockResolvedValue(mockPurchaseResult);

      const { result } = renderHook(() => useSubscriptionStore());

      let purchaseResult: boolean;
      await act(async () => {
        purchaseResult = await result.current.purchaseSubscription('premium_monthly');
      });

      expect(purchaseResult!).toBe(false);
      expect(result.current.error).toBe('Payment failed');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle purchase exceptions', async () => {
      const error = new Error('Purchase exception');
      mockSubscriptionService.purchaseSubscription.mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionStore());

      let purchaseResult: boolean;
      await act(async () => {
        purchaseResult = await result.current.purchaseSubscription('premium_monthly');
      });

      expect(purchaseResult!).toBe(false);
      expect(result.current.error).toBe('Purchase exception');
    });
  });

  describe('restorePurchases', () => {
    it('should restore purchases and refresh status', async () => {
      const mockStatus = {
        isActive: true,
        isTrialActive: false,
        trialDaysRemaining: 0,
        productId: 'premium_monthly'
      };

      mockSubscriptionService.restorePurchases.mockResolvedValue(undefined);
      mockSubscriptionService.checkSubscriptionStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.restorePurchases();
      });

      expect(result.current.subscriptionStatus).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
      expect(mockSubscriptionService.restorePurchases).toHaveBeenCalled();
    });

    it('should handle restore errors', async () => {
      const error = new Error('Restore failed');
      mockSubscriptionService.restorePurchases.mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionStore());

      await act(async () => {
        await result.current.restorePurchases();
      });

      expect(result.current.error).toBe('Restore failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useSubscriptionStore());

      // Set an error first
      act(() => {
        useSubscriptionStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});