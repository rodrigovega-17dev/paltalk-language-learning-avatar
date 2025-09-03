import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import subscriptionService from '../services/subscriptionService';

interface PaywallScreenProps {
  onClose?: () => void;
  onPurchaseSuccess?: () => void;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
  onClose,
  onPurchaseSuccess
}) => {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  
  const { 
    subscriptionStatus, 
    isLoading, 
    error, 
    purchaseSubscription, 
    restorePurchases,
    clearError 
  } = useSubscriptionStore();

  useEffect(() => {
    loadOfferings();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error, clearError]);

  const loadOfferings = async () => {
    try {
      const currentOffering = await subscriptionService.getOfferings();
      setOfferings(currentOffering);
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    const success = await purchaseSubscription(productId);
    if (success) {
      Alert.alert(
        '¡Éxito!', 
        'Tu suscripción ha sido activada.',
        [{ text: 'OK', onPress: onPurchaseSuccess }]
      );
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert(
        'Restauración Completa',
        'Tus compras han sido restauradas.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      // Error is handled by the store
    }
  };

  const formatPrice = (pkg: PurchasesPackage): string => {
    return `${pkg.product.priceString}/${pkg.packageType}`;
  };

  if (loadingOfferings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando opciones de suscripción...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unlock Premium Features</Text>
        <Text style={styles.subtitle}>
          Continue your language learning journey with unlimited conversations
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Premium Features:</Text>
        <Text style={styles.feature}>• Unlimited voice conversations</Text>
        <Text style={styles.feature}>• Advanced AI language tutor</Text>
        <Text style={styles.feature}>• Conversation history</Text>
        <Text style={styles.feature}>• Multiple language support</Text>
        <Text style={styles.feature}>• Personalized learning path</Text>
      </View>

      {subscriptionStatus.isTrialActive && (
        <View style={styles.trialContainer}>
          <Text style={styles.trialText}>
            Trial expires in {subscriptionStatus.trialDaysRemaining} days
          </Text>
        </View>
      )}

      <View style={styles.packagesContainer}>
        {offerings?.availablePackages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={styles.packageButton}
            onPress={() => handlePurchase(pkg.product.identifier)}
            disabled={isLoading}
          >
            <Text style={styles.packageTitle}>
              {pkg.product.title}
            </Text>
            <Text style={styles.packagePrice}>
              {formatPrice(pkg)}
            </Text>
            <Text style={styles.packageDescription}>
              {pkg.product.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isLoading}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.closeText}>Maybe Later</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  feature: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    lineHeight: 22,
  },
  trialContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  trialText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  packagesContainer: {
    margin: 20,
  },
  packageButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  packageDescription: {
    fontSize: 14,
    color: '#e6f2ff',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  restoreButton: {
    padding: 15,
    marginBottom: 10,
  },
  restoreText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  closeButton: {
    padding: 15,
  },
  closeText: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});