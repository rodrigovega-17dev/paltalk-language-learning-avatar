import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { AudioTag, AudioEmotion } from '../types/conversation';
import { elevenLabsService } from '../services/elevenLabsService';

interface AudioTagSelectorProps {
  language: string;
  selectedVoiceId: string;
  onAudioTagSelect: (audioTag: AudioTag) => void;
  currentAudioTag?: AudioTag;
  disabled?: boolean;
}

export const AudioTagSelector: React.FC<AudioTagSelectorProps> = ({
  language,
  selectedVoiceId,
  onAudioTagSelect,
  currentAudioTag,
  disabled = false,
}) => {
  const [testing, setTesting] = useState<string | null>(null);

  const audioTags = elevenLabsService.getAudioTags();

  const handleAudioTagSelect = (audioTag: AudioTag) => {
    console.log(`AudioTagSelector: Selected audio tag: ${audioTag.name}`, audioTag);
    onAudioTagSelect(audioTag);
    
    // Immediately test the audio tag to verify it's working
    if (selectedVoiceId) {
      testAudioTag(audioTag);
    }
  };

  const testAudioTag = async (audioTag: AudioTag) => {
    if (!selectedVoiceId) {
      Alert.alert('Sin Voz Seleccionada', 'Por favor selecciona una voz primero antes de probar las etiquetas de audio.');
      return;
    }

    setTesting(audioTag.id);
    try {
      const testText = language === 'english' ? 'Testing audio tag settings.' :
                      language === 'spanish' ? 'Probando configuración de etiqueta de audio.' :
                      language === 'french' ? 'Test de configuration de balise audio.' :
                      'Audio-Tag-Einstellung testen.';
      
      await elevenLabsService.speakText(
        testText,
        selectedVoiceId,
        language,
        true, // Use loudspeaker
        audioTag.speed,
        audioTag.emotion,
        audioTag.stability,
        audioTag.similarityBoost
      );
    } catch (error) {
              Alert.alert('Prueba Fallida', 'No se pudo reproducir el audio de prueba. Por favor verifica tu clave API de ElevenLabs.');
    } finally {
      setTesting(null);
    }
  };

  const getEmotionColor = (emotion: AudioEmotion): string => {
    const emotionColors: { [key in AudioEmotion]: string } = {
      neutral: '#6B7280',
      happy: '#10B981',
      sad: '#3B82F6',
      angry: '#EF4444',
      excited: '#F59E0B',
      calm: '#8B5CF6',
      friendly: '#06B6D4',
      professional: '#374151',
    };
    return emotionColors[emotion] || '#6B7280';
  };

  const getSpeedLabel = (speed: number): string => {
    if (speed <= 0.8) return 'Slow';
    if (speed <= 1.0) return 'Normal';
    return 'Fast';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Audio Tags</Text>
      <Text style={styles.sectionDescription}>
        Choose predefined voice settings for different learning scenarios
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagsContainer}
      >
        {audioTags.map((audioTag) => {
          const isSelected = currentAudioTag?.id === audioTag.id;
          const isTesting = testing === audioTag.id;
          
          return (
            <View key={audioTag.id} style={styles.tagWrapper}>
              <TouchableOpacity
                style={[
                  styles.audioTag,
                  isSelected && styles.audioTagSelected,
                  disabled && styles.audioTagDisabled
                ]}
                onPress={() => handleAudioTagSelect(audioTag)}
                disabled={disabled || isTesting}
              >
                <Text style={styles.tagIcon}>{audioTag.icon}</Text>
                <Text style={[styles.tagName, isSelected && styles.tagNameSelected]}>
                  {audioTag.name}
                </Text>
                <Text style={[styles.tagDescription, isSelected && styles.tagDescriptionSelected]}>
                  {audioTag.description}
                </Text>
                
                <View style={styles.tagDetails}>
                  <View style={styles.tagDetail}>
                    <Text style={[styles.tagDetailLabel, isSelected && styles.tagDetailLabelSelected]}>
                      Speed:
                    </Text>
                    <Text style={[styles.tagDetailValue, isSelected && styles.tagDetailValueSelected]}>
                      {getSpeedLabel(audioTag.speed)}
                    </Text>
                  </View>
                  
                  <View style={styles.tagDetail}>
                    <Text style={[styles.tagDetailLabel, isSelected && styles.tagDetailLabelSelected]}>
                      Emotion:
                    </Text>
                    <View style={[styles.emotionIndicator, { backgroundColor: getEmotionColor(audioTag.emotion) }]} />
                    <Text style={[styles.tagDetailValue, isSelected && styles.tagDetailValueSelected]}>
                      {audioTag.emotion}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.tagUseCase, isSelected && styles.tagUseCaseSelected]}>
                  {audioTag.useCase}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, isTesting && styles.testButtonTesting]}
                onPress={() => testAudioTag(audioTag)}
                disabled={disabled || isTesting || !selectedVoiceId}
              >
                <Text style={styles.testButtonText}>
                  {isTesting ? 'Testing...' : '🎵 Test'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {!selectedVoiceId && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Select a voice first to test audio tags
          </Text>
        </View>
      )}
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
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  tagsContainer: {
    paddingHorizontal: 4,
  },
  tagWrapper: {
    marginRight: 16,
    alignItems: 'center',
  },
  audioTag: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    width: 200,
    height: 200,
    alignItems: 'center',
  },
  audioTagSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  audioTagDisabled: {
    opacity: 0.5,
  },
  tagIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagNameSelected: {
    color: '#1E40AF',
  },
  tagDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  tagDescriptionSelected: {
    color: '#374151',
  },
  tagDetails: {
    width: '100%',
    marginBottom: 8,
  },
  tagDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagDetailLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  tagDetailLabelSelected: {
    color: '#374151',
  },
  tagDetailValue: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tagDetailValueSelected: {
    color: '#1E40AF',
  },
  emotionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  tagUseCase: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  tagUseCaseSelected: {
    color: '#6B7280',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonTesting: {
    backgroundColor: '#6B7280',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
  },
}); 