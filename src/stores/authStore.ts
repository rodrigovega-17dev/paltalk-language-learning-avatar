import { create } from 'zustand';
import { User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  // Actions
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.signIn(email, password);
      
      if (result.error) {
        set({ error: result.error, isLoading: false });
        return false;
      }
      
      // Update state immediately after successful login
      set({ 
        user: result.user, 
        isAuthenticated: !!result.user, 
        isLoading: false,
        error: null 
      });
      
      // Force a small delay to ensure state propagation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      set({ 
        error: 'An unexpected error occurred', 
        isLoading: false 
      });
      return false;
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await authService.signUp(email, password);
      
      if (result.error) {
        set({ error: result.error, isLoading: false });
        return false;
      }
      
      set({ 
        user: result.user, 
        isAuthenticated: !!result.user, 
        isLoading: false,
        error: null 
      });
      return true;
    } catch (error) {
      set({ 
        error: 'An unexpected error occurred', 
        isLoading: false 
      });
      return false;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    
    try {
      await authService.signOut();
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null 
      });
    } catch (error) {
      set({ 
        error: 'Failed to sign out', 
        isLoading: false 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User | null) => {
    set({ 
      user, 
      isAuthenticated: !!user,
      error: null 
    });
  },
}));

// Initialize auth state listener
authService.onAuthStateChange((user) => {
  console.log('Auth state changed:', user ? user.email : 'signed out');
  useAuthStore.getState().setUser(user);
});

// Initialize with current user if available (with multiple checks to ensure session restoration)
const checkForUser = () => {
  const currentUser = authService.getCurrentUser();
  if (currentUser) {
    console.log('Auth store: Setting initial user from auth service:', currentUser.email);
    useAuthStore.getState().setUser(currentUser);
  } else {
    console.log('Auth store: No user found, will check again...');
  }
};

// Check immediately and then with delays to catch session restoration
checkForUser();
setTimeout(checkForUser, 100);
setTimeout(checkForUser, 500);
setTimeout(checkForUser, 1000);