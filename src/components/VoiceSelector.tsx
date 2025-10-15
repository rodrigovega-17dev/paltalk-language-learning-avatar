import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { elevenLabsService, ElevenLabsVoice } from '../services/elevenLabsService';
import { conversationFlowController } from '../services/conversationFlowController';

interface VoiceSelectorProps {
  language: string;
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  language,
  selectedVoiceId,
  onVoiceSelect,
  disabled = false,
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVoiceInfo, setCurrentVoiceInfo] = useState<ElevenLabsVoice | null>(null);

  useEffect(() => {
    loadVoices();
  }, [language]);

  useEffect(() => {
    if (selectedVoiceId) {
      loadCurrentVoiceInfo();
    }
  }, [selectedVoiceId]);

  const loadVoices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const availableVoices = await elevenLabsService.getVoicesForLanguage(language);
      setVoices(availableVoices);
      
      // If no voice is selected and we have voices, select the first one
      if (!selectedVoiceId && availableVoices.length > 0) {
        const controllerVoice = conversationFlowController.getTTSSettings().voiceId;
        if (!controllerVoice) {
          onVoiceSelect(availableVoices[0].voice_id);
        }
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
      setError('Failed to load voices. Please check your ElevenLabs API key.');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentVoiceInfo = async () => {
    if (!selectedVoiceId) return;
    
    try {
      const voiceInfo = await elevenLabsService.getVoiceInfo(selectedVoiceId);
      setCurrentVoiceInfo(voiceInfo);
      
      if (voiceInfo) {
        console.log(`VoiceSelector: Current voice - ${voiceInfo.name} (${voiceInfo.language})`);
      }
    } catch (err) {
      console.error('Failed to load current voice info:', err);
    }
  };

  const handleVoiceSelect = (voice: ElevenLabsVoice) => {
    onVoiceSelect(voice.voice_id);
  };

  const testVoice = async (voice: ElevenLabsVoice) => {
    try {
      const testText = language === 'english' ? 'Hello, this is a test.' :
                      language === 'spanish' ? 'Hola, esto es una prueba.' :
                      language === 'french' ? 'Bonjour, ceci est un test.' :
                      'Hallo, das ist ein Test.';
      
      // Get current audio settings from conversation flow controller
      const currentSettings = conversationFlowController.getTTSSettings();
      const speed = currentSettings.speed || 1.0;
      const emotion = currentSettings.emotion || 'neutral';
      const stability = currentSettings.stability || 0.6;
      const similarityBoost = currentSettings.similarityBoost || 0.5;
      
      await elevenLabsService.speakText(
        testText, 
        voice.voice_id, 
        language, 
        true, 
        speed,
        emotion,
        stability,
        similarityBoost
        // No callbacks needed for test playback
      );
    } catch (error) {
              Alert.alert('Prueba Fallida', 'No se pudo reproducir el audio de prueba. Por favor verifica tu clave API de ElevenLabs.');
    }
  };

  const testLoudspeaker = async (voice: ElevenLabsVoice) => {
    try {
      // Get current audio settings from conversation flow controller
      const currentSettings = conversationFlowController.getTTSSettings();
      const speed = currentSettings.speed || 1.0;
      const emotion = currentSettings.emotion || 'neutral';
      
      await elevenLabsService.testLoudspeaker(voice.voice_id, language, speed, emotion);
    } catch (error) {
              Alert.alert('Prueba de Altavoz Fallida', 'No se pudo probar la salida del altavoz.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Available Voices</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading voices...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Available Voices</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVoices}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (voices.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Available Voices</Text>
        <Text style={styles.noVoicesText}>No voices available for {language}.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.voicesList}
        contentContainerStyle={styles.voicesListContent}
      >
        {voices.map((voice) => {
          const isSelected = selectedVoiceId === voice.voice_id;
          
          return (
            <View key={voice.voice_id} style={styles.voiceWrapper}>
              <TouchableOpacity
                style={[
                  styles.voiceCard,
                  isSelected && styles.voiceCardSelected,
                  disabled && styles.voiceCardDisabled
                ]}
                onPress={() => handleVoiceSelect(voice)}
                disabled={disabled}
              >
                <Text style={styles.voiceIcon}>
                  {voice.gender === 'female' ? '👩' : voice.gender === 'male' ? '👨' : '🎤'}
                </Text>
                <Text 
                  style={[styles.voiceName, isSelected && styles.voiceNameSelected]}
                  numberOfLines={2}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.9}
                >
                  {voice.name}
                </Text>
                <Text 
                  style={[styles.voiceDescription, isSelected && styles.voiceDescriptionSelected]}
                  numberOfLines={4}
                >
                  {voice.description_es || voice.description || 'Voz generada por IA'}
                </Text>
                

              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testButton}
                onPress={() => testVoice(voice)}
                disabled={disabled}
              >
                <Text style={styles.testButtonText}>🎵</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noVoicesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  voicesList: {
    // Horizontal scroll container
  },
  voicesListContent: {
    paddingHorizontal: 4,
  },
  voiceWrapper: {
    marginRight: 16,
    alignItems: 'center',
  },
  voiceCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    width: 200,
    height: 200,
    alignItems: 'center',
  },
  voiceCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  voiceCardDisabled: {
    opacity: 0.5,
  },
  voiceIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  voiceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 22,
    includeFontPadding: false,
  },
  voiceNameSelected: {
    color: '#1E40AF',
  },
  voiceLanguage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'capitalize',
    lineHeight: 18,
    includeFontPadding: false,
  },
  voiceLanguageSelected: {
    color: '#374151',
  },
  voiceDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
    includeFontPadding: false,
  },
  voiceDescriptionSelected: {
    color: '#374151',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
  },

}); 