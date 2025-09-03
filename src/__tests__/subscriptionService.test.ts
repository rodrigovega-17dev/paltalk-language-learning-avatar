import { SubscriptionService } from '../services/subscriptionService';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  logIn: jest.fn(),
  getCustomerInfo: jest.fn(),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  LOG_LEVEL: {
    INFO: 'INFO'
  }
}));

const mockPurchases = Purchases as jest.Mocked<typeof Purchases>;

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;

  beforeEach(() => {
    // Reset singleton instance for testing
    (SubscriptionService as any).instance = undefined;
    subscriptionService = SubscriptionService.getInstance();
    // Reset initialization state
    (subscriptionService as any).isInitialized = false;
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should configure RevenueCat with API key', async () => {
      mockPurchases.configure.mockResolvedValue(undefined);
      
      await subscriptionService.initialize('test-api-key');
      
      expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should log in user if userId provided', async () => {
      mockPurchases.configure.mockResolvedValue(undefined);
      mockPurchases.logIn.mockResolvedValue({} as any);
      
      await subscriptionService.initialize('test-api-key', 'user-123');
      
      expect(mockPurchases.logIn).toHaveBeenCalledWith('user-123');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Configuration failed');
      mockPurchases.configure.mockRejectedValue(error);
      
      await expect(subscriptionService.initialize('test-api-key')).rejects.toThrow('Configuration failed');
    });
  });

  describe('checkSubscriptionStatus', () => {
    it('should return active subscription status', async () => {
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: ['premium_monthly'],
        entitlements: {
          active: {},
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const status = await subscriptionService.checkSubscriptionStatus();
      
      expect(status.isActive).toBe(true);
      expect(status.productId).toBe('premium_monthly');
    });

    it('should return inactive subscription status', async () => {
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: [],
        entitlements: {
          active: {},
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const status = await subscriptionService.checkSubscriptionStatus();
      
      expect(status.isActive).toBe(false);
      expect(status.isTrialActive).toBe(false);
      expect(status.trialDaysRemaining).toBe(0);
    });

    it('should handle trial subscription status', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: [],
        entitlements: {
          active: {
            'premium': {
              willRenew: true,
              periodType: 'trial',
              expirationDate: futureDate.toISOString()
            } as any
          },
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const status = await subscriptionService.checkSubscriptionStatus();
      
      expect(status.isTrialActive).toBe(true);
      expect(status.trialDaysRemaining).toBe(5);
    });

    it('should handle expired trial', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: [],
        entitlements: {
          active: {
            'premium': {
              willRenew: true,
              periodType: 'trial',
              expirationDate: pastDate.toISOString()
            } as any
          },
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const status = await subscriptionService.checkSubscriptionStatus();
      
      expect(status.isTrialActive).toBe(false);
      expect(status.trialDaysRemaining).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      mockPurchases.getCustomerInfo.mockRejectedValue(new Error('Network error'));
      
      const status = await subscriptionService.checkSubscriptionStatus();
      
      expect(status.isActive).toBe(false);
      expect(status.isTrialActive).toBe(false);
      expect(status.trialDaysRemaining).toBe(0);
    });
  });

  describe('purchaseSubscription', () => {
    it('should successfully purchase subscription', async () => {
      const mockOffering: Partial<PurchasesOffering> = {
        availablePackages: [
          {
            identifier: 'monthly',
            product: {
              identifier: 'premium_monthly'
            }
          } as any
        ]
      };
      
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: ['premium_monthly']
      };
      
      mockPurchases.getOfferings.mockResolvedValue({
        current: mockOffering as PurchasesOffering
      } as any);
      
      mockPurchases.purchasePackage.mockResolvedValue({
        customerInfo: mockCustomerInfo as CustomerInfo
      } as any);
      
      const result = await subscriptionService.purchaseSubscription('premium_monthly');
      
      expect(result.success).toBe(true);
      expect(mockPurchases.purchasePackage).toHaveBeenCalled();
    });

    it('should handle no offerings available', async () => {
      mockPurchases.getOfferings.mockResolvedValue({
        current: null
      } as any);
      
      const result = await subscriptionService.purchaseSubscription('premium_monthly');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No offerings available');
    });

    it('should handle product not found', async () => {
      const mockOffering: Partial<PurchasesOffering> = {
        availablePackages: [
          {
            identifier: 'monthly',
            product: {
              identifier: 'different_product'
            }
          } as any
        ]
      };
      
      mockPurchases.getOfferings.mockResolvedValue({
        current: mockOffering as PurchasesOffering
      } as any);
      
      const result = await subscriptionService.purchaseSubscription('premium_monthly');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });

    it('should handle purchase errors', async () => {
      const mockOffering: Partial<PurchasesOffering> = {
        availablePackages: [
          {
            identifier: 'monthly',
            product: {
              identifier: 'premium_monthly'
            }
          } as any
        ]
      };
      
      mockPurchases.getOfferings.mockResolvedValue({
        current: mockOffering as PurchasesOffering
      } as any);
      
      mockPurchases.purchasePackage.mockRejectedValue(new Error('Purchase failed'));
      
      const result = await subscriptionService.purchaseSubscription('premium_monthly');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Purchase failed');
    });
  });

  describe('restorePurchases', () => {
    it('should restore purchases successfully', async () => {
      mockPurchases.restorePurchases.mockResolvedValue({} as any);
      
      await expect(subscriptionService.restorePurchases()).resolves.not.toThrow();
      expect(mockPurchases.restorePurchases).toHaveBeenCalled();
    });

    it('should handle restore errors', async () => {
      mockPurchases.restorePurchases.mockRejectedValue(new Error('Restore failed'));
      
      await expect(subscriptionService.restorePurchases()).rejects.toThrow('Restore failed');
    });
  });

  describe('validateTrialAccess', () => {
    it('should return true for active subscription', async () => {
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: ['premium_monthly'],
        entitlements: {
          active: {},
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const hasAccess = await subscriptionService.validateTrialAccess();
      
      expect(hasAccess).toBe(true);
    });

    it('should return true for active trial', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: [],
        entitlements: {
          active: {
            'premium': {
              willRenew: true,
              periodType: 'trial',
              expirationDate: futureDate.toISOString()
            } as any
          },
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const hasAccess = await subscriptionService.validateTrialAccess();
      
      expect(hasAccess).toBe(true);
    });

    it('should return false for expired trial and no subscription', async () => {
      const mockCustomerInfo: Partial<CustomerInfo> = {
        activeSubscriptions: [],
        entitlements: {
          active: {},
          all: {}
        }
      };
      
      mockPurchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo as CustomerInfo);
      
      const hasAccess = await subscriptionService.validateTrialAccess();
      
      expect(hasAccess).toBe(false);
    });
  });
});