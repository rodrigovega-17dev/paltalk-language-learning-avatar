import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../types/auth';

// Supabase configuration - these should be environment variables in production
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export interface ProfileService {
  updateProfile(userId: string, profile: Partial<UserProfile>): Promise<{ success: boolean; error?: string }>;
  getProfile(userId: string): Promise<{ profile: UserProfile | null; error?: string }>;
}

class SupabaseProfileService implements ProfileService {
  private supabase: SupabaseClient;
  private isConfigured: boolean = false;

  constructor() {
    try {
      // Only initialize if we have valid URLs
      if (SUPABASE_URL !== 'https://placeholder.supabase.co' && SUPABASE_ANON_KEY !== 'placeholder-anon-key') {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConfigured = true;
      } else {
        // Use placeholder values that won't cause URL errors in development
        this.supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
        this.isConfigured = false;
        console.warn('Supabase not configured. Profile service will use mock data.');
      }
    } catch (error) {
      console.warn('Failed to initialize Supabase client for profiles:', error);
      this.supabase = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
      this.isConfigured = false;
    }
  }

  async updateProfile(userId: string, profile: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      // Return success for development mode
      return { success: true };
    }

    try {
      const updateData: any = {};

      if (profile.targetLanguage !== undefined) {
        updateData.target_language = profile.targetLanguage;
      }
      if (profile.cefrLevel !== undefined) {
        updateData.cefr_level = profile.cefrLevel;
      }
      if (profile.subscriptionStatus !== undefined) {
        updateData.subscription_status = profile.subscriptionStatus;
      }
      if (profile.trialStartDate !== undefined) {
        updateData.trial_start_date = profile.trialStartDate.toISOString();
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }

  async getProfile(userId: string): Promise<{ profile: UserProfile | null; error?: string }> {
    console.log('ProfileService getProfile called for userId:', userId, 'isConfigured:', this.isConfigured);

    if (!this.isConfigured) {
      console.log('ProfileService not configured, returning default profile');
      // Return default profile for development mode
      return {
        profile: {
          targetLanguage: 'english',
          cefrLevel: 'B1',
          subscriptionStatus: 'trial',
          trialStartDate: new Date(),
        }
      };
    }

    try {
      console.log('ProfileService querying database for profile...');
      const { data: profiles, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId);

      if (error) {
        console.log('ProfileService database error:', error.message);
        return { profile: null, error: error.message };
      }

      if (!profiles || profiles.length === 0) {
        console.log('ProfileService: No profile found, creating default profile');

        // Create default profile if it doesn't exist
        const defaultProfile: UserProfile = {
          targetLanguage: 'english',
          cefrLevel: 'A1',
          subscriptionStatus: 'trial',
          trialStartDate: new Date(),
        };

        const { error: insertError } = await this.supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: 'user@example.com', // We don't have email in this context
            target_language: defaultProfile.targetLanguage,
            cefr_level: defaultProfile.cefrLevel,
            subscription_status: defaultProfile.subscriptionStatus,
            trial_start_date: defaultProfile.trialStartDate.toISOString(),
          });

        if (insertError) {
          console.log('ProfileService: Error creating profile:', insertError.message);
          return { profile: null, error: `Failed to create profile: ${insertError.message}` };
        }

        console.log('ProfileService: Default profile created successfully');
        return { profile: defaultProfile };
      }

      // If multiple profiles exist, use the first one and log a warning
      if (profiles.length > 1) {
        console.warn('ProfileService: Multiple profiles found for user, using the first one');
      }

      const profile = profiles[0];



      console.log('ProfileService: Profile found and mapped successfully');
      return {
        profile: {
          targetLanguage: profile.target_language,
          cefrLevel: profile.cefr_level,
          subscriptionStatus: profile.subscription_status,
          trialStartDate: new Date(profile.trial_start_date),
        }
      };
    } catch (error) {
      console.log('ProfileService network error:', error);
      return { profile: null, error: 'Network error occurred' };
    }
  }
}

// Export singleton instance
export const profileService = new SupabaseProfileService();