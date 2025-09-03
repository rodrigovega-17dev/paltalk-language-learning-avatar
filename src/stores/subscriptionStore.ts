import { create } from 'zustand';
import { SubscriptionStatus } from '../types/subscription';
import subscriptionService from '../services/subscriptionService';

interface SubscriptionState {
  subscriptionStatus: SubscriptionStatus;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  checkSubscriptionStatus: () => Promise<void>;
  purchaseSubscription: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptionStatus: {
    isActive: false,
    isTrialActive: false,
    trialDaysRemaining: 0
  },
  isLoading: false,
  error: null,

  checkSubscriptionStatus: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const status = await subscriptionService.checkSubscriptionStatus();
      set({ subscriptionStatus: status, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to check subscription status',
        isLoading: false 
      });
    }
  },

  purchaseSubscription: async (productId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await subscriptionService.purchaseSubscription(productId);
      
      if (result.success) {
        // Refresh subscription status after successful purchase
        await get().checkSubscriptionStatus();
        return true;
      } else {
        set({ 
          error: result.error || 'Purchase failed',
          isLoading: false 
        });
        return false;
      }
    } catch (error: any) {
      set({ 
        error: error.message || 'Purchase failed',
        isLoading: false 
      });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    
    try {
      await subscriptionService.restorePurchases();
      // Refresh subscription status after restore
      await get().checkSubscriptionStatus();
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to restore purchases',
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null })
}));