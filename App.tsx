import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProtectedRoute } from './src/components/ProtectedRoute';
import { ConversationScreen } from './src/components/ConversationScreen';
import { SettingsScreen } from './src/components/SettingsScreen';

function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<'conversation' | 'settings'>('conversation');

  const handleNavigateToSettings = () => {
    setCurrentScreen('settings');
  };

  const handleNavigateToConversation = () => {
    setCurrentScreen('conversation');
  };

  return (
    <>
      {currentScreen === 'conversation' ? (
        <ConversationScreen onNavigateToSettings={handleNavigateToSettings} />
      ) : (
        <SettingsScreen onNavigateBack={handleNavigateToConversation} />
      )}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProtectedRoute>
        <MainApp />
      </ProtectedRoute>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});
