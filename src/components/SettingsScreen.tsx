import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LanguageSelector } from './LanguageSelector';
import { CEFRLevelSelector, CEFRLevel } from './CEFRLevelSelector';
import { VoiceSelector } from './VoiceSelector';
import { AudioTagSelector } from './AudioTagSelector';
import { profileService } from '../services/profileService';
import { authService } from '../services/authService';
import { conversationFlowController } from '../services/conversationFlowController';
import { conversationService } from '../services/conversationService';
import { elevenLabsService } from '../services/elevenLabsService';
import { UserProfile } from '../types/auth';
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
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [selectedAudioTag, setSelectedAudioTag] = useState<AudioTag | undefined>(undefined);

  useEffect(() => {
    loadProfile();
    // Ensure ElevenLabs is set as provider (already default)
    conversationService.setTTSProvider('elevenlabs');
    
    // Load current TTS settings
    const currentSettings = conversationFlowController.getTTSSettings();
    
    // Load current audio tag if available
    if (currentSettings.emotion && currentSettings.speed) {
      const audioTags = elevenLabsService.getAudioTags();
      const matchingTag = audioTags.find((tag: AudioTag) => 
        tag.emotion === currentSettings.emotion && 
        tag.speed === currentSettings.speed
      );
      setSelectedAudioTag(matchingTag);
    }
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

  const handleLanguageChange = (language: string) => {
    if (profile) {
      setProfile({ ...profile, targetLanguage: language });
      setHasChanges(true);
    }
  };

  const handleLevelChange = (level: CEFRLevel) => {
    if (profile) {
      setProfile({ ...profile, cefrLevel: level });
      setHasChanges(true);
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
    
    // Update conversation flow controller TTS settings
    const currentSettings = conversationFlowController.getTTSSettings();
    const newSettings = {
      ...currentSettings,
      provider: 'elevenlabs' as const,
      voiceId: selectedVoiceId,
      useSpeaker: true, // Always use loudspeaker
      speed: audioTag.speed,
      emotion: audioTag.emotion,
      stability: audioTag.stability,
      similarityBoost: audioTag.similarityBoost,
    };
    
    conversationFlowController.setTTSSettings(newSettings);
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
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar el perfil</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Configuración</Text>
          {(onClose || onNavigateBack) && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onNavigateBack || onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferencias de Aprendizaje</Text>
            
            <LanguageSelector
              selectedLanguage={profile.targetLanguage}
              onLanguageSelect={handleLanguageChange}
              disabled={saving}
            />

            <CEFRLevelSelector
              selectedLevel={profile.cefrLevel}
              onLevelSelect={handleLevelChange}
              disabled={saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuración de Voz</Text>
            <Text style={styles.sectionDescription}>
              Voces de IA de alta calidad impulsadas por ElevenLabs
            </Text>
            
            <VoiceSelector
              language={profile?.targetLanguage || 'english'}
              selectedVoiceId={selectedVoiceId}
              onVoiceSelect={handleVoiceSelect}
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
            <Text style={styles.sectionTitle}>Estado de Suscripción</Text>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionStatus}>
                Estado: {profile.subscriptionStatus.charAt(0).toUpperCase() + profile.subscriptionStatus.slice(1)}
              </Text>
              {profile.subscriptionStatus === 'trial' && (
                <Text style={styles.trialInfo}>
                  Prueba iniciada: {profile.trialStartDate.toLocaleDateString()}
                </Text>
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
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={saving}
            >
              <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
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
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
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