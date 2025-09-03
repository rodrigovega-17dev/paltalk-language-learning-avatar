// Subscription related types
export interface SubscriptionStatus {
  isActive: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  productId?: string;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}