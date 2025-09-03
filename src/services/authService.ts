import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResult, UserProfile } from '../types/auth';

// Supabase configuration - these should be environment variables in production
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export interface AuthService {
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChange(callback: (user: User | null) => void): void;
  updateUserProfile(profileUpdates: Partial<UserProfile>): Promise<void>;
}

class SupabaseAuthService implements AuthService {
  private supabase: SupabaseClient;
  private currentUser: User | null = null;
  private isConfigured: boolean = false;
  private authStateCallback: ((user: User | null) => void) | null = null;

  constructor() {
    // Configure Supabase with AsyncStorage for session persistence
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    
    // Check if we have real credentials (not placeholder values)
    if (SUPABASE_URL !== 'https://placeholder.supabase.co' && 
        SUPABASE_ANON_KEY !== 'placeholder-anon-key' &&
        SUPABASE_URL.includes('supabase.co')) {
      this.isConfigured = true;
      console.log('Auth service: Configured with real Supabase credentials and persistent storage, initializing...');
      this.initializeAuth();
    } else {
      this.isConfigured = false;
      console.warn('Supabase not configured. Authentication will use mock data.');
    }
  }

  private async initializeAuth() {
    try {
      console.log('Auth service: Initializing with persistent storage and checking for existing session...');
      
      // Wait a bit for AsyncStorage to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.log('Auth service: Error getting session:', error.message);
        return;
      }
      
      if (session?.user) {
        console.log('Auth service: ✅ EXISTING SESSION FOUND for user:', session.user.email);
        this.currentUser = await this.mapSupabaseUserToUser(session.user);
        console.log('Auth service: ✅ USER RESTORED from persistent session:', this.currentUser.email);
      } else {
        console.log('Auth service: ❌ No existing session found in storage');
      }
    } catch (error) {
      console.log('Auth service: Error initializing auth:', error);
    }
  }

  private async mapSupabaseUserToUser(supabaseUser: SupabaseUser): Promise<User> {
    console.log('Mapping Supabase user to app user:', supabaseUser.id);
    
    // Fetch user profile from database
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error || !profile) {
      console.log('Profile not found, creating default profile. Error:', error?.message);
      
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
          id: supabaseUser.id,
          email: supabaseUser.email!,
          target_language: defaultProfile.targetLanguage,
          cefr_level: defaultProfile.cefrLevel,
          subscription_status: defaultProfile.subscriptionStatus,
          trial_start_date: defaultProfile.trialStartDate.toISOString(),
        });

      if (insertError) {
        console.log('Error creating profile:', insertError.message);
      } else {
        console.log('Default profile created successfully');
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        profile: defaultProfile,
      };
    }

    console.log('Existing profile found, mapping data');
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      profile: {
        targetLanguage: profile.target_language,
        cefrLevel: profile.cefr_level,
        subscriptionStatus: profile.subscription_status,
        trialStartDate: new Date(profile.trial_start_date),
      },
    };
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    if (!this.isConfigured) {
      // Return mock success for development
      return { user: this.currentUser };
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const user = await this.mapSupabaseUserToUser(data.user);
        this.currentUser = user;
        return { user };
      }

      return { user: null, error: 'Failed to create user' };
    } catch (error) {
      return { user: null, error: 'Network error occurred' };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    console.log('Auth service signIn called, isConfigured:', this.isConfigured);
    
    if (!this.isConfigured) {
      console.log('Using mock authentication');
      return { user: this.currentUser };
    }

    try {
      console.log('Attempting Supabase sign in...');
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Supabase auth error:', error.message);
        return { user: null, error: error.message };
      }

      if (data.user) {
        console.log('Supabase user authenticated, mapping to app user...');
        const user = await this.mapSupabaseUserToUser(data.user);
        this.currentUser = user;
        console.log('User mapped successfully:', user.email);
        
        // Manually trigger auth state callback to ensure immediate UI update
        if (this.authStateCallback) {
          console.log('Manually triggering auth state callback after signIn');
          this.authStateCallback(user);
        }
        
        return { user };
      }

      console.log('No user returned from Supabase');
      return { user: null, error: 'Failed to sign in' };
    } catch (error) {
      console.log('Network error during sign in:', error);
      return { user: null, error: 'Network error occurred' };
    }
  }

  async signOut(): Promise<void> {
    if (this.isConfigured) {
      await this.supabase.auth.signOut();
    }
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: User | null) => void): void {
    this.authStateCallback = callback;
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth state change event:', event);
      if (session?.user) {
        const user = await this.mapSupabaseUserToUser(session.user);
        this.currentUser = user;
        callback(user);
      } else {
        this.currentUser = null;
        callback(null);
      }
    });
  }

  // Method to manually trigger auth state update (for session restoration)
  triggerAuthStateUpdate(): void {
    if (this.currentUser) {
      console.log('Manually triggering auth state update for:', this.currentUser.email);
      // We'll need to store the callback to trigger it manually
    }
  }

  async updateUserProfile(profileUpdates: Partial<UserProfile>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // Update the current user's profile in memory
    this.currentUser.profile = {
      ...this.currentUser.profile,
      ...profileUpdates,
    };

    console.log('Auth service: User profile updated in memory:', profileUpdates);
  }
}

// Export singleton instance
export const authService = new SupabaseAuthService();