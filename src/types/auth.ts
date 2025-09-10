// Authentication related types
export interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface UserProfile {
  targetLanguage: string;
  nativeLanguage: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  subscriptionStatus: 'trial' | 'active' | 'expired';
  trialStartDate: Date;
}

export interface AuthResult {
  user: User | null;
  error?: string;
}