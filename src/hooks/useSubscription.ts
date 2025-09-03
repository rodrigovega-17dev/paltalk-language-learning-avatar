import { useEffect } from 'react';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import subscriptionService from '../services/subscriptionService';

export const useSubscription = () => {
  const {
    subscriptionStatus,
    isLoading,
    error,
    checkSubscriptionStatus,
    purchaseSubscription,
    restorePurchases,
    clearError
  } = useSubscriptionStore();

  useEffect(() => {
    // Initialize subscription service and check status on mount
    const initializeSubscription = async () => {
      try {
        // Initialize with your RevenueCat API key
        await subscriptionService.initialize(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'your-api-key');
        await checkSubscriptionStatus();
      } catch (error) {
        console.error('Failed to initialize subscription service:', error);
      }
    };

    initializeSubscription();
  }, [checkSubscriptionStatus]);

  const hasAccess = subscriptionStatus.isActive || subscriptionStatus.isTrialActive;

  return {
    // Status
    subscriptionStatus,
    isLoading,
    error,
    hasAccess,
    
    // Actions
    purchaseSubscription,
    restorePurchases,
    checkSubscriptionStatus,
    clearError,
    
    // Convenience methods
    isTrialActive: subscriptionStatus.isTrialActive,
    trialDaysRemaining: subscriptionStatus.trialDaysRemaining,
    isSubscriptionActive: subscriptionStatus.isActive
  };
};