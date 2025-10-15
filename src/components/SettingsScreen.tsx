import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AndroidText } from './AndroidText';
import { LanguageSelector } from './LanguageSelector';
import { LanguagePairIndicator } from './LanguagePairIndicator';
import { CEFRLevelSelector, CEFRLevel } from './CEFRLevelSelector';
import { VoiceSelector } from './VoiceSelector';
import { AudioTagSelector } from './AudioTagSelector';
import { SpeedPresetSelector } from './SpeedPresetSelector';
import { profileService } from '../services/profileService';
import { authService } from '../services/authService';
import { conversationFlowController } from '../services/conversationFlowController';
import { conversationService } from '../services/conversationService';
import { elevenLabsService } from '../services/elevenLabsService';
import { streakService } from '../services/streakService';
import { UserProfile, StreakData } from '../types/auth';
import { AudioTag } from '../types/conversation';

interface SettingsScreenProps {
  onClose?: () => void;
  onNavigateBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose, onNavigateBack }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [selectedAudioTag, setSelectedAudioTag] = useState<AudioTag | undefined>(undefined);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    loadProfile();
    
    // Load streak data when user is authenticated
    let interval: NodeJS.Timeout;
    
    const checkAuthAndLoadStreak = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user && user.id) {
          console.log('SettingsScreen: User authenticated, loading streak data...');
          await loadStreakData();
          // Clear interval once we've loaded the data
          if (interval) clearInterval(interval);
        } else {
          console.log('SettingsScreen: User not authenticated yet, waiting...');
        }
      } catch (error) {
        console.error('SettingsScreen: Error checking auth:', error);
      }
    };

    // Check immediately
    checkAuthAndLoadStreak();
    
    // Also check periodically until user is authenticated (every 2 seconds)
    interval = setInterval(checkAuthAndLoadStreak, 2000);
    
    // Cleanup interval after 10 seconds
    setTimeout(() => {
      if (interval) clearInterval(interval);
    }, 10000);
    
    const currentSettings = conversationFlowController.getTTSSettings();
    setSelectedVoiceId(currentSettings.voiceId || '');
    setSpeechSpeed(currentSettings.speed || 1.0);

    if (currentSettings.emotion && currentSettings.speed) {
      const audioTags = elevenLabsService.getAudioTags();
      const matchingTag = audioTags.find((tag: AudioTag) =>
        tag.emotion === currentSettings.emotion &&
        tag.speed === currentSettings.speed
      );
      setSelectedAudioTag(matchingTag);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadProfile = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      Alert.alert('Error', 'No hay usuario conectado');
      return;
    }

    setLoading(true);
    
    if (currentUser.profile) {
      setProfile(currentUser.profile);
    } else {
      Alert.alert('Error', 'Perfil de usuario no disponible');
    }
    
    setLoading(false);
  };

  const loadStreakData = async () => {
    try {
      console.log('SettingsScreen: Loading streak data...');
      const user = await authService.getCurrentUser();
      console.log('SettingsScreen: Current user:', user?.id);
      
      if (user) {
        const result = await streakService.getStreakData(user.id);
        console.log('SettingsScreen: Streak data result:', result);
        
        if (result.success && result.streakData) {
          setStreakData(result.streakData);
          console.log('SettingsScreen: Streak data set:', result.streakData);
        } else {
          console.warn('SettingsScreen: Failed to load streak data:', result.error);
        }
      } else {
        console.warn('SettingsScreen: No user found');
      }
    } catch (error) {
      console.error('SettingsScreen: Failed to load streak data:', error);
    }
  };

  const handleLanguageChange = async (language: string) => {
    if (profile) {
      const updatedProfile = { ...profile, targetLanguage: language };
      setProfile(updatedProfile);
      setHasChanges(true);
      
      // Auto-save language changes immediately
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          setAutoSaving(true);
          const result = await profileService.updateProfile(currentUser.id, {
            targetLanguage: language,
          });
          
          if (result.success) {
            // Update auth service in-memory profile
            await authService.updateUserProfile({ targetLanguage: language });
            setHasChanges(false);
            console.log('Language updated successfully to:', language);
          }
        } catch (error) {
          console.error('Failed to auto-save language change:', error);
          // Keep hasChanges true so user can manually save later
        } finally {
          setAutoSaving(false);
        }
      }
    }
  };

  const handleNativeLanguageChange = async (language: string) => {
    if (profile) {
      const updatedProfile = { ...profile, nativeLanguage: language };
      setProfile(updatedProfile);
      setHasChanges(true);
      
      // Auto-save native language changes immediately
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          setAutoSaving(true);
          const result = await profileService.updateProfile(currentUser.id, {
            nativeLanguage: language,
          });
          
          if (result.success) {
            // Update auth service in-memory profile
            await authService.updateUserProfile({ nativeLanguage: language });
            // Update conversation flow controller
            conversationFlowController.updateNativeLanguageSettings(language);
            setHasChanges(false);
            console.log('Native language updated successfully to:', language);
          }
        } catch (error) {
          console.error('Failed to auto-save native language change:', error);
          // Keep hasChanges true so user can manually save later
        } finally {
          setAutoSaving(false);
        }
      }
    }
  };

  const handleLevelChange = async (level: CEFRLevel) => {
    if (profile) {
      const updatedProfile = { ...profile, cefrLevel: level };
      setProfile(updatedProfile);
      setHasChanges(true);
      
      // Auto-save level changes immediately
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        try {
          setAutoSaving(true);
          const result = await profileService.updateProfile(currentUser.id, {
            cefrLevel: level,
          });
          
          if (result.success) {
            // Update auth service in-memory profile
            await authService.updateUserProfile({ cefrLevel: level });
            setHasChanges(false);
            console.log('CEFR level updated successfully to:', level);
          }
        } catch (error) {
          console.error('Failed to auto-save level change:', error);
          // Keep hasChanges true so user can manually save later
        } finally {
          setAutoSaving(false);
        }
      }
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    
    // Update conversation flow controller TTS settings
    const currentSettings = conversationFlowController.getTTSSettings();
    const newSettings = {
      ...currentSettings,
      provider: 'elevenlabs' as const,
      voiceId: voiceId,
      useSpeaker: true, // Always use loudspeaker
    };
    
    conversationFlowController.setTTSSettings(newSettings);
  };

  const handleAudioTagSelect = (audioTag: AudioTag) => {
    setSelectedAudioTag(audioTag);
    setSpeechSpeed(audioTag.speed);

    const currentSettings = conversationFlowController.getTTSSettings();
    const newSettings = {
      ...currentSettings,
      provider: 'elevenlabs' as const,
      voiceId: currentSettings.voiceId || selectedVoiceId,
      useSpeaker: true,
      speed: audioTag.speed,
      emotion: audioTag.emotion,
      stability: audioTag.stability,
      similarityBoost: audioTag.similarityBoost,
    };

    conversationFlowController.setTTSSettings(newSettings);
  };

  const handleSpeedChange = (speed: number) => {
    setSpeechSpeed(speed);

    const currentSettings = conversationFlowController.getTTSSettings();
    const newSettings = {
      ...currentSettings,
      speed,
      voiceId: currentSettings.voiceId || selectedVoiceId,
    };

    conversationFlowController.setTTSSettings(newSettings);
  };

  const handleTestSpeed = async (speed: number) => {
    if (!selectedVoiceId || !profile?.targetLanguage) {
      Alert.alert('Configuración Incompleta', 'Por favor selecciona una voz primero.');
      return;
    }

    const testText = profile.targetLanguage === 'english' ? 'Testing speech speed.' :
                    profile.targetLanguage === 'spanish' ? 'Probando velocidad del habla.' :
                    profile.targetLanguage === 'french' ? 'Test de vitesse de parole.' :
                    'Teste der Sprechgeschwindigkeit.';

    const currentSettings = conversationFlowController.getTTSSettings();
    
    await elevenLabsService.speakText(
      testText,
      selectedVoiceId,
      profile.targetLanguage,
      true, // Use loudspeaker
      speed,
      currentSettings.emotion || 'neutral',
      currentSettings.stability || 0.6,
      currentSettings.similarityBoost || 0.5
      // No callbacks needed for test playback
    );
  };

  const saveProfile = async () => {
    if (!profile) return;

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      Alert.alert('Error', 'No hay usuario conectado');
      return;
    }

    setSaving(true);
    
    try {
      const result = await profileService.updateProfile(currentUser.id, {
        targetLanguage: profile.targetLanguage,
        cefrLevel: profile.cefrLevel,
      });
      
      if (result.success) {
        setHasChanges(false);
        Alert.alert('Éxito', 'Perfil actualizado exitosamente');
      } else {
        throw new Error(result.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              Alert.alert('Error', 'Error al cerrar sesión');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <AndroidText style={styles.loadingText}>Cargando perfil...</AndroidText>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <AndroidText style={styles.errorText}>Error al cargar el perfil</AndroidText>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <AndroidText style={styles.retryButtonText}>Reintentar</AndroidText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AndroidText style={styles.title}>BlaBla! Configuración</AndroidText>
          <View style={styles.headerRight}>
            {autoSaving && (
              <View style={styles.autoSavingIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <AndroidText style={styles.autoSavingText}>Guardando...</AndroidText>
              </View>
            )}
            {(onClose || onNavigateBack) && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onNavigateBack || onClose}
              >
                <AndroidText style={styles.closeButtonText}>✕</AndroidText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Streak Section */}
          {streakData && (
            <View style={styles.section}>
              <AndroidText style={styles.sectionTitle}>Racha 🔥</AndroidText>
              <View style={styles.streakCard}>
                <View style={styles.streakRow}>
                  <AndroidText style={styles.streakLabel}>Racha actual:</AndroidText>
                  <AndroidText style={styles.streakValue}>
                    🔥 {streakData.currentStreak} días
                  </AndroidText>
                </View>
                <View style={styles.streakRow}>
                  <AndroidText style={styles.streakLabel}>Mejor racha:</AndroidText>
                  <AndroidText style={styles.streakValue}>
                    🏆 {streakData.longestStreak} días
                  </AndroidText>
                </View>
                <View style={styles.streakRow}>
                  <AndroidText style={styles.streakLabel}>Congelaciones:</AndroidText>
                  <AndroidText style={styles.streakValue}>
                    ❄️ {2 - streakData.streakFreezeCount}/2 disponibles
                  </AndroidText>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <AndroidText style={styles.sectionTitle}>Preferencias de Aprendizaje</AndroidText>
            
            <LanguageSelector
              selectedLanguage={profile.nativeLanguage}
              onLanguageSelect={handleNativeLanguageChange}
              disabled={saving}
              mode="native"
              excludedLanguages={profile.targetLanguage ? [profile.targetLanguage] : []}
            />

            <LanguageSelector
              selectedLanguage={profile.targetLanguage}
              onLanguageSelect={handleLanguageChange}
              disabled={saving}
              mode="target"
              excludedLanguages={profile.nativeLanguage ? [profile.nativeLanguage] : []}
            />

            <LanguagePairIndicator
              nativeLanguage={profile.nativeLanguage}
              targetLanguage={profile.targetLanguage}
            />

            <CEFRLevelSelector
              selectedLevel={profile.cefrLevel}
              onLevelSelect={handleLevelChange}
              disabled={saving}
            />
          </View>

          <View style={styles.section}>
            <AndroidText style={styles.sectionTitle}>Configuración de Voz</AndroidText>
            <AndroidText style={styles.sectionDescription}>
              Voces de IA de alta calidad impulsadas por ElevenLabs
            </AndroidText>
            
            <VoiceSelector
              language={profile?.targetLanguage || 'english'}
              selectedVoiceId={selectedVoiceId}
              onVoiceSelect={handleVoiceSelect}
              disabled={saving}
            />

            <SpeedPresetSelector
              selectedSpeed={speechSpeed}
              onSpeedSelect={handleSpeedChange}
              onTestSpeed={handleTestSpeed}
              disabled={saving}
            />
          </View>

          {/* Audio Tags Section - Temporarily Hidden */}
          {false && (
            <View style={styles.section}>
              <AudioTagSelector
                language={profile?.targetLanguage || 'english'}
                selectedVoiceId={selectedVoiceId}
                onAudioTagSelect={handleAudioTagSelect}
                currentAudioTag={selectedAudioTag}
                disabled={saving}
              />
            </View>
          )}

          <View style={styles.section}>
            <AndroidText style={styles.sectionTitle}>Estado de Suscripción</AndroidText>
            <View style={styles.subscriptionInfo}>
              <AndroidText style={styles.subscriptionStatus}>
                Estado: {profile.subscriptionStatus.charAt(0).toUpperCase() + profile.subscriptionStatus.slice(1)}
              </AndroidText>
              {profile.subscriptionStatus === 'trial' && (
                <AndroidText style={styles.trialInfo}>
                  Prueba iniciada: {profile.trialStartDate.toLocaleDateString()}
                </AndroidText>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {hasChanges && (
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <AndroidText
                    style={styles.saveButtonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                  >
                    Guardar Cambios
                  </AndroidText>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={saving}
            >
              <AndroidText
                style={styles.signOutButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                Cerrar Sesión
              </AndroidText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    lineHeight: 32,
    includeFontPadding: false,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoSavingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
  },
  autoSavingText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
    includeFontPadding: false,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  streakCard: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  streakValue: {
    fontSize: 16,
    color: '#FF6F00',
    fontWeight: '600',
  },
  subscriptionInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  subscriptionStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  trialInfo: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    marginVertical: 20,
    paddingBottom: 40,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    includeFontPadding: false,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});