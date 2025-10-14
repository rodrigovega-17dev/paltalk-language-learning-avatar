import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AndroidText } from './AndroidText';
import { AuthInput } from './AuthInput';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { useAuthStore } from '../stores/authStore';

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const { signIn, isLoading, error, clearError } = useAuthStore();

  // Watch for auth errors and update local state
  useEffect(() => {
    console.log('LoginScreen: Auth error changed:', error);
    if (error) {
      console.log('LoginScreen: Setting authError:', error);
      setAuthError(error);
    }
  }, [error]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('El correo electrónico es obligatorio');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Por favor ingresa una dirección de correo válida');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('La contraseña es obligatoria');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    // Clear any previous errors
    clearError();
    setAuthError('');
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    // The signIn function will set error in the store if it fails
    // Our useEffect will catch it and update the UI
    await signIn(email, password);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Bienvenido a BlaBla</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar tu viaje de aprendizaje de idiomas</Text>

          <AuthInput
            label="Correo Electrónico"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ingresa tu correo electrónico"
          />

          <AuthInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            isPassword
            placeholder="Ingresa tu contraseña"
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => setShowForgotPasswordModal(true)}
          >
            <AndroidText style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</AndroidText>
          </TouchableOpacity>

          {/* Auth Error Display */}
          {authError && (
            <View style={styles.authErrorContainer}>
              <AndroidText style={styles.authErrorText}>{authError}</AndroidText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <AndroidText
              style={styles.loginButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </AndroidText>
          </TouchableOpacity>

          <View style={styles.signUpContainer}>
            <AndroidText style={styles.signUpText}>¿No tienes una cuenta? </AndroidText>
            <TouchableOpacity onPress={onNavigateToSignUp}>
              <AndroidText style={styles.signUpLink}>Registrarse</AndroidText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
    lineHeight: 36,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    includeFontPadding: false,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 16,
    color: '#666',
  },
  signUpLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  authErrorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  authErrorText: {
    color: '#cc0000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});