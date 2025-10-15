import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StreakData } from '../types/auth';
import { authService } from './authService';

// Supabase configuration - these should be environment variables in production
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export interface StreakService {
  recordInteraction(userId: string): Promise<{ success: boolean; error?: string; streakData?: StreakData }>;
  getStreakData(userId: string): Promise<{ success: boolean; error?: string; streakData?: StreakData }>;
  useStreakFreeze(userId: string): Promise<{ success: boolean; error?: string; streakData?: StreakData }>;
}

export class SupabaseStreakService implements StreakService {
  private supabase: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    try {
      // Prefer reusing the existing Supabase client from auth service when available
      const sharedClient = authService.getSupabaseClient();

      if (sharedClient) {
        this.supabase = sharedClient;
        this.isConfigured = authService.hasValidConfiguration();
        console.log('StreakService: Using shared Supabase client from auth service');
        return;
      }

      console.log('StreakService: Initializing standalone Supabase client with URL:', SUPABASE_URL.substring(0, 30) + '...');
      console.log('StreakService: Has API key:', SUPABASE_ANON_KEY !== 'placeholder-anon-key');
      
      // Only initialize if we have valid URLs
      if (SUPABASE_URL !== 'https://placeholder.supabase.co' && SUPABASE_ANON_KEY !== 'placeholder-anon-key') {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConfigured = true;
        console.log('StreakService: Successfully configured with standalone Supabase client');
      } else {
        this.supabase = null;
        this.isConfigured = false;
        console.warn('StreakService: Supabase not configured. Will use mock data.');
      }
    } catch (error) {
      console.warn('StreakService: Failed to initialize Supabase client:', error);
      this.supabase = null;
      this.isConfigured = false;
    }
  }

  /**
   * Records today's interaction and updates streak accordingly
   */
  async recordInteraction(userId: string): Promise<{ success: boolean; error?: string; streakData?: StreakData }> {
    if (!this.supabase || !this.isConfigured) {
      // Return mock success for development mode
      return { 
        success: true, 
        streakData: {
          currentStreak: 1,
          longestStreak: 1,
          lastInteractionDate: new Date(),
          streakFreezeCount: 0,
          canUseFreeze: true
        }
      };
    }

    try {
      const today = new Date();
      const todayDateString = this.getDateString(today);

      // Get current profile data
      const supabase = this.supabase!;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_interaction_date, streak_freeze_count')
        .eq('id', userId)
        .single();

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      if (!profile) {
        return { success: false, error: 'User profile not found' };
      }

      const lastInteractionDate = profile.last_interaction_date
        ? this.parseDateString(profile.last_interaction_date)
        : null;
      const currentStreak = profile.current_streak || 0;
      const longestStreak = profile.longest_streak || 0;
      const streakFreezeCount = profile.streak_freeze_count || 0;

      // Calculate new streak
      const newStreakData = this.calculateStreak(lastInteractionDate, today, currentStreak, streakFreezeCount);

      // Record today's interaction in daily_interactions table
      const { error: interactionError } = await supabase
        .from('daily_interactions')
        .upsert({
          user_id: userId,
          interaction_date: todayDateString,
          message_count: 1
        }, {
          onConflict: 'user_id,interaction_date'
        });

      if (interactionError) {
        console.warn('Failed to record daily interaction:', interactionError.message);
        // Continue with streak update even if daily interaction fails
      }

      // Update user profile with new streak data
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          current_streak: newStreakData.currentStreak,
          longest_streak: Math.max(longestStreak, newStreakData.currentStreak),
          last_interaction_date: todayDateString,
          streak_freeze_count: newStreakData.streakFreezeCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const finalStreakData: StreakData = {
        currentStreak: newStreakData.currentStreak,
        longestStreak: Math.max(longestStreak, newStreakData.currentStreak),
        lastInteractionDate: this.parseDateString(todayDateString),
        streakFreezeCount: newStreakData.streakFreezeCount,
        canUseFreeze: newStreakData.streakFreezeCount < 2
      };

      return { success: true, streakData: finalStreakData };
    } catch (error) {
      console.error('Error recording interaction:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Fetches current streak data for a user
   */
  async getStreakData(userId: string): Promise<{ success: boolean; error?: string; streakData?: StreakData }> {
    if (!this.supabase || !this.isConfigured) {
      // Return mock data for development mode
      return { 
        success: true, 
        streakData: {
          currentStreak: 5,
          longestStreak: 12,
          lastInteractionDate: new Date(),
          streakFreezeCount: 1,
          canUseFreeze: true
        }
      };
    }

    try {
      const supabase = this.supabase!;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_interaction_date, streak_freeze_count')
        .eq('id', userId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!profile) {
        return { 
          success: true, 
          streakData: {
            currentStreak: 0,
            longestStreak: 0,
            lastInteractionDate: null,
            streakFreezeCount: 0,
            canUseFreeze: true
          }
        };
      }

      const streakData: StreakData = {
        currentStreak: profile.current_streak || 0,
        longestStreak: profile.longest_streak || 0,
        lastInteractionDate: profile.last_interaction_date
          ? this.parseDateString(profile.last_interaction_date)
          : null,
        streakFreezeCount: profile.streak_freeze_count || 0,
        canUseFreeze: (profile.streak_freeze_count || 0) < 2
      };

      return { success: true, streakData };
    } catch (error) {
      console.error('Error fetching streak data:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Uses a streak freeze to maintain streak after missing a day
   */
  async useStreakFreeze(userId: string): Promise<{ success: boolean; error?: string; streakData?: StreakData }> {
    if (!this.supabase || !this.isConfigured) {
      return { success: false, error: 'Streak freeze not available in development mode' };
    }

    try {
      const supabase = this.supabase!;
      // Get current profile data
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_interaction_date, streak_freeze_count')
        .eq('id', userId)
        .single();

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      if (!profile) {
        return { success: false, error: 'User profile not found' };
      }

      const currentFreezeCount = profile.streak_freeze_count || 0;

      if (currentFreezeCount >= 2) {
        return { success: false, error: 'No streak freezes available' };
      }

      // Update freeze count
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          streak_freeze_count: currentFreezeCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Return updated streak data
      const streakData: StreakData = {
        currentStreak: profile.current_streak || 0,
        longestStreak: profile.longest_streak || 0,
        lastInteractionDate: profile.last_interaction_date ? new Date(profile.last_interaction_date) : null,
        streakFreezeCount: currentFreezeCount + 1,
        canUseFreeze: (currentFreezeCount + 1) < 2
      };

      return { success: true, streakData };
    } catch (error) {
      console.error('Error using streak freeze:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  /**
   * Calculates streak based on last interaction date and current date
   */
  private calculateStreak(
    lastDate: Date | null, 
    currentDate: Date, 
    currentStreak: number,
    freezeCount: number
  ): { currentStreak: number; streakFreezeCount: number } {
    if (!lastDate) {
      // First interaction ever
      return { currentStreak: 1, streakFreezeCount: freezeCount };
    }

    const daysDiff = this.getDaysDifference(lastDate, currentDate);

    if (daysDiff === 0) {
      // Same day - no change to streak
      return { currentStreak, streakFreezeCount: freezeCount };
    } else if (daysDiff === 1) {
      // Consecutive day - increment streak
      return { currentStreak: currentStreak + 1, streakFreezeCount: freezeCount };
    } else if (daysDiff === 2 && freezeCount < 2) {
      // One day gap with freeze available - maintain streak, use freeze
      return { currentStreak, streakFreezeCount: freezeCount + 1 };
    } else {
      // Gap too large or no freeze available - reset streak
      return { currentStreak: 1, streakFreezeCount: freezeCount };
    }
  }

  /**
   * Gets the difference in days between two dates (using local dates)
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const localDate1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const localDate2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diffTime = localDate2.getTime() - localDate1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Converts Date to YYYY-MM-DD string for database storage
   */
  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateString(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
}

// Export singleton instance
export const streakService = new SupabaseStreakService();
