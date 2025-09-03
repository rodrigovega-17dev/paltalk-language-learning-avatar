import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import { PaywallScreen } from './PaywallScreen';

export const SubscriptionExample: React.FC = () => {
  const {
    hasAccess,
    isTrialActive,
    trialDaysRemaining,
    isSubscriptionActive,
    isLoading,
    error
  } = useSubscription();

  const [showPaywall, setShowPaywall] = React.useState(false);

  if (showPaywall) {
    return (
      <PaywallScreen
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={() => setShowPaywall(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscription Status</Text>
      
      {isLoading && <Text style={styles.loading}>Loading...</Text>}
      
      {error && <Text style={styles.error}>Error: {error}</Text>}
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Access: {hasAccess ? '✅ Granted' : '❌ Denied'}
        </Text>
        
        {isSubscriptionActive && (
          <Text style={styles.statusText}>
            🎉 Active Subscription
          </Text>
        )}
        
        {isTrialActive && (
          <Text style={styles.statusText}>
            🆓 Trial Active ({trialDaysRemaining} days remaining)
          </Text>
        )}
        
        {!hasAccess && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowPaywall(true)}
          >
            <Text style={styles.upgradeText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loading: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  error: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});