import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type AuthScreen = 'login' | 'signup';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Give some time for the auth state to initialize
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Additional effect to handle auth state changes
  useEffect(() => {
    if (isAuthenticated && user && isInitializing) {
      console.log('ProtectedRoute: User authenticated during initialization, stopping loading');
      setIsInitializing(false);
    }
  }, [isAuthenticated, user, isInitializing]);

  // Show loading spinner while initializing or during auth operations
  // But don't show loading if user is already authenticated
  if ((isInitializing || isLoading) && !isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // If user is authenticated, render the protected content
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  // If not authenticated, show auth screens
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onNavigateToSignUp={() => setCurrentScreen('signup')}
      />
    );
  }

  return (
    <SignUpScreen
      onNavigateToLogin={() => setCurrentScreen('login')}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});