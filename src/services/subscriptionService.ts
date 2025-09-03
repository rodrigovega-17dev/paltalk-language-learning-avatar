import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  LOG_LEVEL 
} from 'react-native-purchases';
import { SubscriptionStatus, PurchaseResult } from '../types/subscription';

export class SubscriptionService {
  private static instance: SubscriptionService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async initialize(apiKey: string, userId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure RevenueCat
      Purchases.setLogLevel(LOG_LEVEL.INFO);
      await Purchases.configure({ apiKey });
      
      if (userId) {
        await Purchases.logIn(userId);
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const activeSubscriptions = customerInfo.activeSubscriptions;
      const isActive = activeSubscriptions.length > 0;
      
      // Check trial status
      const trialInfo = this.getTrialInfo(customerInfo);
      
      return {
        isActive,
        isTrialActive: trialInfo.isTrialActive,
        trialDaysRemaining: trialInfo.trialDaysRemaining,
        productId: activeSubscriptions[0] || undefined
      };
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return {
        isActive: false,
        isTrialActive: false,
        trialDaysRemaining: 0
      };
    }
  }

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering) {
        return { success: false, error: 'No offerings available' };
      }

      const packageToPurchase = currentOffering.availablePackages.find(
        pkg => pkg.product.identifier === productId
      );

      if (!packageToPurchase) {
        return { success: false, error: 'Product not found' };
      }

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Verify the purchase was successful
      const isActive = customerInfo.activeSubscriptions.length > 0;
      
      return { success: isActive };
    } catch (error: any) {
      console.error('Purchase failed:', error);
      return { 
        success: false, 
        error: error.message || 'Purchase failed' 
      };
    }
  }

  async restorePurchases(): Promise<void> {
    try {
      await Purchases.restorePurchases();
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  async isTrialActive(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const trialInfo = this.getTrialInfo(customerInfo);
      return trialInfo.isTrialActive;
    } catch (error) {
      console.error('Failed to check trial status:', error);
      return false;
    }
  }

  async getTrialDaysRemaining(): Promise<number> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const trialInfo = this.getTrialInfo(customerInfo);
      return trialInfo.trialDaysRemaining;
    } catch (error) {
      console.error('Failed to get trial days remaining:', error);
      return 0;
    }
  }

  async validateTrialAccess(): Promise<boolean> {
    try {
      const status = await this.checkSubscriptionStatus();
      return status.isActive || status.isTrialActive;
    } catch (error) {
      console.error('Failed to validate trial access:', error);
      return false;
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  private getTrialInfo(customerInfo: CustomerInfo): { isTrialActive: boolean; trialDaysRemaining: number } {
    // Check if user has any active trial subscriptions
    const entitlements = customerInfo.entitlements.active;
    
    for (const entitlementId in entitlements) {
      const entitlement = entitlements[entitlementId];
      if (entitlement.willRenew && entitlement.periodType === 'trial') {
        const expirationDate = new Date(entitlement.expirationDate!);
        const now = new Date();
        const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          isTrialActive: daysRemaining > 0,
          trialDaysRemaining: Math.max(0, daysRemaining)
        };
      }
    }

    return { isTrialActive: false, trialDaysRemaining: 0 };
  }
}

export default SubscriptionService.getInstance();