import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { elevenLabsService, ElevenLabsVoice } from '../services/elevenLabsService';
import { AudioEmotion } from '../types/conversation';

interface EnhancedVoiceSelectorProps {
  language: string;
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string, voiceName: string) => void;
  onPreview?: (voiceId: string) => void;
  showPreview?: boolean;
}

export const EnhancedVoiceSelector: React.FC<EnhancedVoiceSelectorProps> = ({
  language,
  selectedVoiceId,
  onVoiceSelect,
  onPreview,
  showPreview = true
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVoices();
  }, [language]);

  const loadVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const availableVoices = await elevenLabsService.getVoicesForLanguage(language);
      setVoices(availableVoices);
      
      if (availableVoices.length === 0) {
        setError(`No voices available for ${language}. Please check your ElevenLabs subscription.`);
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
      setError('Failed to load voices. Please check your internet connection and ElevenLabs API key.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (voiceId: string, voiceName: string) => {
    if (previewingVoice) {
      Alert.alert('Preview in Progress', 'Please wait for the current preview to finish.');
      return;
    }

    try {
      setPreviewingVoice(voiceId);
      
      if (onPreview) {
        onPreview(voiceId);
      } else {
        // Default preview behavior
        await elevenLabsService.previewVoice(voiceId, '', language);
      }
    } catch (err) {
      console.error('Voice preview failed:', err);
      Alert.alert(
        'Preview Failed', 
        `Could not preview ${voiceName}. Please check your internet connection.`,
        [{ text: 'OK' }]
      );
    } finally {
      setPreviewingVoice(null);
    }
  };

  const renderVoiceItem = ({ item }: { item: ElevenLabsVoice }) => {
    const isSelected = item.voice_id === selectedVoiceId;
    const isPreviewing = previewingVoice === item.voice_id;

    return (
      <View style={[styles.voiceItem, isSelected && styles.selectedVoiceItem]}>
        <TouchableOpacity
          style={styles.voiceInfo}
          onPress={() => onVoiceSelect(item.voice_id, item.name)}
          disabled={isPreviewing}
        >
          <Text style={[styles.voiceName, isSelected && styles.selectedVoiceName]}>
            {item.name}
          </Text>
          <Text style={styles.voiceDetails}>
            {item.language} • {item.gender || 'Unknown'}
          </Text>
          {item.description && (
            <Text style={styles.voiceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </TouchableOpacity>
        
        {showPreview && (
          <TouchableOpacity
            style={[styles.previewButton, isPreviewing && styles.previewingButton]}
            onPress={() => handlePreview(item.voice_id, item.name)}
            disabled={isPreviewing}
          >
            {isPreviewing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.previewButtonText}>Preview</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading voices...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVoices}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Voice for {language}</Text>
      <Text style={styles.subtitle}>
        {voices.length} voice{voices.length !== 1 ? 's' : ''} available
      </Text>
      
      <FlatList
        data={voices}
        renderItem={renderVoiceItem}
        keyExtractor={(item) => item.voice_id}
        style={styles.voiceList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  voiceList: {
    flex: 1,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedVoiceItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedVoiceName: {
    color: '#1976d2',
  },
  voiceDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  voiceDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  previewingButton: {
    backgroundColor: '#666',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});